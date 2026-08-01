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

/**
 * Headers we refuse to forward upstream.
 *
 * Beyond the hop-by-hop ones, the forwarding family is stripped deliberately:
 * the bridge derives the customer's IP from `X-Forwarded-For` for login
 * throttling and for WHMCS' fraud checks, and a browser-supplied value there is
 * pure attacker input. We rebuild that header ourselves below.
 */
const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "cookie",
  "authorization",
  "accept-encoding",
  "transfer-encoding",
  "upgrade",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "forwarded",
]);

/**
 * Set to `true` only when this app runs behind a reverse proxy you control
 * (nginx, a load balancer, Cloudflare). It says the inbound `x-forwarded-for`
 * was written by that proxy and its left-most entry can be believed. Left off,
 * we send no forwarding header at all and the bridge falls back to this
 * server's address — which is honest, if coarse.
 */
const TRUST_PROXY = process.env.TRUST_PROXY_HEADERS === "true";

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

/**
 * Build the upstream URL, or `null` if the path is not one we will proxy.
 *
 * `encodeURIComponent` leaves dots untouched, so a `..` segment would survive
 * it and `fetch` would then normalise the path — letting a caller climb out of
 * `/api/v1` and reach anything else served on the bridge's host. Segments are
 * therefore checked, not just escaped.
 */
function buildUrl(request: NextRequest, segments: string[]): string | null {
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return null;
  }
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

  const clientIp = resolveClientIp(request);
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  return headers;
}

/**
 * The caller's address, as far as *we* can vouch for it.
 *
 * One entry, no chain: the bridge reads the n-th hop from the right, and a
 * single trustworthy value is easier to configure against (`NUM_PROXIES=1`)
 * than a chain whose length depends on the deployment.
 */
function resolveClientIp(request: NextRequest): string | null {
  if (!TRUST_PROXY) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip")?.trim() || null;
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

  const url = buildUrl(request, path);
  if (!url) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Unknown endpoint.", details: {} } },
      { status: 404 },
    );
  }

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? null : await request.arrayBuffer();

  const call: UpstreamCall = {
    url,
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
