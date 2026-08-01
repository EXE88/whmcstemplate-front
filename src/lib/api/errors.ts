/**
 * One error type for the whole frontend.
 *
 * The bridge answers every failure with the same envelope, so the client parses
 * it once here and the UI only ever branches on `code`.
 */

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[] | string>;
    request_id?: string;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, string[] | string>;
  readonly requestId: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, string[] | string> = {},
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** Field -> first message, for react-hook-form `setError`. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [field, value] of Object.entries(this.details)) {
      const text = Array.isArray(value) ? value[0] : value;
      if (typeof text === "string" && text) out[field] = text;
    }
    return out;
  }

  /** Errors after which retrying the same request is pointless or dangerous. */
  get isFatalForRetry(): boolean {
    return this.code === "order_outcome_unknown" || this.code === "order_in_progress";
  }
}

export const NETWORK_ERROR_CODE = "network_error";

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Build an ApiError from a bridge response body (or a sensible fallback). */
export function apiErrorFromBody(status: number, body: unknown): ApiError {
  const envelope = body as Partial<ApiErrorEnvelope>;
  const error = envelope?.error;
  if (error && typeof error.code === "string") {
    return new ApiError(
      status,
      error.code,
      error.message || "",
      (error.details as Record<string, string[] | string>) ?? {},
      error.request_id ?? null,
    );
  }
  if (status === 429) {
    return new ApiError(status, "throttled", "Too many requests.");
  }
  return new ApiError(status, "internal_error", "Unexpected server error.");
}
