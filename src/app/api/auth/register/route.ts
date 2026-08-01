import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL, writeSession } from "@/server/session";
import type { TokenPair } from "@/lib/api/types";

/** Registration returns the same token pair as login (201), so it lands in cookies too. */
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
    upstream = await fetch(`${API_BASE_URL}/auth/register/`, {
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
  const response = NextResponse.json({ user: tokens.user }, { status: 201 });
  writeSession(response, tokens);
  return response;
}
