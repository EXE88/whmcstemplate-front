import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL, writeSession } from "@/server/session";
import type { TokenPair } from "@/lib/api/types";

/**
 * Login is not proxied through the generic BFF route because it is the one call
 * whose *response* must become cookies rather than reach the browser. The token
 * pair is consumed here; the client only ever learns the identity.
 *
 * An OTP step slots in later as a second POST to this same route with a
 * `code` field — the shape below already carries `two_factor_enabled`.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid request body.", details: {} } },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
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

  const body = await upstream.json().catch(() => null);
  if (!upstream.ok || !body?.access) {
    return NextResponse.json(body ?? { error: { code: "internal_error", message: "" } }, {
      status: upstream.status || 500,
    });
  }

  const tokens = body as TokenPair;
  const response = NextResponse.json({ user: tokens.user });
  writeSession(response, tokens);
  return response;
}
