import "server-only";

import type { NextResponse } from "next/server";
import type { SessionUser, TokenPair } from "@/lib/api/types";

/**
 * Server-side session storage.
 *
 * Access and refresh tokens live in `httpOnly` cookies and are attached to
 * upstream calls by the BFF proxy — no token is ever readable from JavaScript,
 * so an XSS on the storefront cannot walk away with a 14-day refresh token.
 *
 * `lh_user` is a *non*-httpOnly companion cookie holding only the display
 * identity (email + client id). It exists so the client can render the right
 * chrome without a round-trip; it grants no access on its own.
 */

export const ACCESS_COOKIE = "lh_at";
export const REFRESH_COOKIE = "lh_rt";
export const USER_COOKIE = "lh_user";

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 14 * 24 * 60 * 60;

export const API_BASE_URL = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

const secure = process.env.NODE_ENV === "production";

function baseCookie(maxAge: number) {
  return {
    httpOnly: true as const,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function writeSession(response: NextResponse, tokens: TokenPair): void {
  response.cookies.set(ACCESS_COOKIE, tokens.access, baseCookie(ACCESS_MAX_AGE));
  response.cookies.set(REFRESH_COOKIE, tokens.refresh, baseCookie(REFRESH_MAX_AGE));
  response.cookies.set(USER_COOKIE, encodeURIComponent(JSON.stringify(tokens.user)), {
    ...baseCookie(REFRESH_MAX_AGE),
    httpOnly: false,
  });
}

/** Replace just the token pair after a refresh; the identity cookie is unchanged. */
export function writeTokens(
  response: NextResponse,
  tokens: { access: string; refresh: string },
): void {
  response.cookies.set(ACCESS_COOKIE, tokens.access, baseCookie(ACCESS_MAX_AGE));
  response.cookies.set(REFRESH_COOKIE, tokens.refresh, baseCookie(REFRESH_MAX_AGE));
}

export function clearSession(response: NextResponse): void {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE]) {
    response.cookies.set(name, "", { ...baseCookie(0), httpOnly: name !== USER_COOKIE });
  }
}

export function parseUserCookie(raw: string | undefined): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as SessionUser;
    return typeof parsed?.email === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/* -- refresh, de-duplicated ------------------------------------------------ */

export interface RefreshResult {
  access: string;
  refresh: string;
}

/**
 * One refresh per token, remembered for a short while afterwards.
 *
 * Refresh tokens rotate and the old one is blacklisted the moment it is spent.
 * That makes a naive "refresh on 401" unsafe twice over:
 *
 *  - Requests that 401 *simultaneously* would each spend the same token; all
 *    but one would get a blacklist rejection. Sharing the in-flight promise
 *    fixes that.
 *  - A request that 401s a moment *later* still carries the old cookie, because
 *    the browser had not yet seen the rotated `Set-Cookie`. Deleting the entry
 *    as soon as the call settled would send that straggler to the login page
 *    for no reason. So the settled result is retained briefly and replayed.
 *
 * The window only has to outlive one round-trip, hence seconds rather than
 * minutes; entries are evicted on read and the map is capped so a long-running
 * server cannot accumulate spent tokens.
 */
const REPLAY_WINDOW_MS = 30_000;
const MAX_TRACKED = 500;

interface RefreshEntry {
  promise: Promise<RefreshResult | null>;
  expiresAt: number;
}

const refreshes = new Map<string, RefreshEntry>();

function evictExpired(now: number): void {
  for (const [token, entry] of refreshes) {
    if (entry.expiresAt <= now) refreshes.delete(token);
  }
  // Under pathological load, drop oldest-first rather than grow without bound.
  while (refreshes.size > MAX_TRACKED) {
    const oldest = refreshes.keys().next();
    if (oldest.done) break;
    refreshes.delete(oldest.value);
  }
}

export function refreshTokens(refresh: string): Promise<RefreshResult | null> {
  const now = Date.now();
  evictExpired(now);

  const existing = refreshes.get(refresh);
  if (existing) return existing.promise;

  const promise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
      });
      if (!response.ok) return null;
      const data = (await response.json()) as Partial<RefreshResult>;
      if (!data.access) return null;
      // Rotation is upstream's choice: keep the new refresh, or the old one if
      // the install has rotation disabled.
      return { access: data.access, refresh: data.refresh ?? refresh };
    } catch {
      return null;
    }
  })();

  // A failed refresh is not worth replaying — the token is genuinely dead, and
  // caching the failure would keep a recovered session locked out.
  void promise.then((result) => {
    if (result === null) refreshes.delete(refresh);
  });

  refreshes.set(refresh, { promise, expiresAt: now + REPLAY_WINDOW_MS });
  return promise;
}
