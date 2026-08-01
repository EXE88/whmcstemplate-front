import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  API_BASE_URL,
  REFRESH_COOKIE,
  clearSession,
  refreshTokens,
  writeTokens,
} from "@/server/session";

/**
 * The only door between the browser and the bridge.
 *
 * Everything the SPA fetches goes through `/api/bff/<upstream path>`: the proxy
 * attaches the `Authorization` header from the httpOnly cookie, transparently
 * refreshes a rotated token pair on 401 and retries once, and forwards the
 * bridge's error envelope untouched so the client can branch on `code`.
 *
 * Consequences worth stating: the browser never holds a token, `Idempotency-Key`
 * is passed straight through (the SPA still owns the key), and binary
 * attachment downloads stream back with their `Content-Disposition` intact.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Headers we refuse to forward upstream (hop-by-hop or rewritten by fetch). */
const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "cookie",
  "authorization",
  "accept-encoding",
  "transfer-encoding",
  "upgrade",
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "set-cookie",
]);

interface UpstreamCall {
  url: string;
  method: string;
  headers: Headers;
  body: ArrayBuffer | null;
}

function buildUrl(request: NextRequest, segments: string[]): string {
  const path = segments.map(encodeURIComponent).join("/");
  const query = request.nextUrl.search;
  // The bridge's Django routes all end in a slash.
  return `${API_BASE_URL}/${path}/${query}`;
}

function forwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}

async function callUpstream(call: UpstreamCall, accessToken: string | null) {
  const headers = new Headers(call.headers);
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  return fetch(call.url, {
    method: call.method,
    headers,
    body: call.body ? Buffer.from(call.body) : undefined,
    cache: "no-store",
    redirect: "manual",
  });
}

function relayResponse(upstream: Response, body: ArrayBuffer): NextResponse {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  return new NextResponse(body, { status: upstream.status, headers });
}

function sessionExpired(): NextResponse {
  const response = NextResponse.json(
    {
      error: {
        code: "session_expired",
        message: "Your session has expired.",
        details: {},
        request_id: null,
      },
    },
    { status: 401 },
  );
  clearSession(response);
  return response;
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  if (!path?.length) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Unknown endpoint.", details: {} } },
      { status: 404 },
    );
  }

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? null : await request.arrayBuffer();

  const call: UpstreamCall = {
    url: buildUrl(request, path),
    method,
    headers: forwardHeaders(request),
    body: body && body.byteLength > 0 ? body : null,
  };

  const access = request.cookies.get(ACCESS_COOKIE)?.value ?? null;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value ?? null;

  let upstream: Response;
  try {
    upstream = await callUpstream(call, access);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "upstream_unreachable",
          message: "The API did not respond.",
          details: {},
        },
      },
      { status: 504 },
    );
  }

  // One refresh, one retry. A second 401 means the refresh token is gone too.
  if (upstream.status === 401 && refresh) {
    const rotated = await refreshTokens(refresh);
    if (!rotated) return sessionExpired();

    let retried: Response;
    try {
      retried = await callUpstream(call, rotated.access);
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "upstream_unreachable",
            message: "The API did not respond.",
            details: {},
          },
        },
        { status: 504 },
      );
    }

    if (retried.status === 401) return sessionExpired();

    const payload = await retried.arrayBuffer();
    const response = relayResponse(retried, payload);
    writeTokens(response, rotated);
    return response;
  }

  if (upstream.status === 401 && !refresh) return sessionExpired();

  const payload = await upstream.arrayBuffer();
  return relayResponse(upstream, payload);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
