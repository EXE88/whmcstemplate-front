import { ApiError, apiErrorFromBody } from "./errors";

/**
 * Browser-side transport.
 *
 * Every call goes to the local BFF, never to the bridge directly, so there is
 * no token to attach here and no CORS to negotiate. Token refresh, rotation and
 * retry all happen server-side in `/api/bff` — this file stays a thin,
 * strongly-typed fetch.
 */

const BFF_PREFIX = "/api/bff";

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  /** Serialised as JSON unless it is already a `FormData`. */
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** Fired when the refresh token is gone; the app shell listens and redirects. */
export const SESSION_EXPIRED_EVENT = "lh:session-expired";

function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => null);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, headers = {}, signal } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const init: RequestInit = {
    method,
    signal,
    headers: {
      accept: "application/json",
      ...(body !== undefined && !isFormData ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    // Cookies are same-origin (the BFF); this keeps them attached on every call.
    credentials: "same-origin",
  };

  if (body !== undefined) {
    init.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${BFF_PREFIX}${path}${buildQuery(query)}`, init);
  } catch (cause) {
    if ((cause as Error)?.name === "AbortError") throw cause;
    throw new ApiError(0, "network_error", "Network request failed.");
  }

  if (!response.ok) {
    const payload = await parseBody(response);
    const error = apiErrorFromBody(response.status, payload);
    if (error.code === "session_expired" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    throw error;
  }

  return (await parseBody(response)) as T;
}

/** Binary download that keeps the server-provided filename. */
export async function downloadFile(
  path: string,
  query: Record<string, QueryValue>,
  fallbackName: string,
): Promise<void> {
  const response = await fetch(`${BFF_PREFIX}${path}${buildQuery(query)}`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw apiErrorFromBody(response.status, await parseBody(response));
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filename = match ? decodeURIComponent(match[1].trim()) : fallbackName;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/* -- session routes (outside the proxy) ----------------------------------- */

export async function postAuth<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "network_error", "Network request failed.");
  }
  if (!response.ok) throw apiErrorFromBody(response.status, await parseBody(response));
  return (await parseBody(response)) as T;
}
