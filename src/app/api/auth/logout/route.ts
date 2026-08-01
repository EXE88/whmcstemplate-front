import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, API_BASE_URL, REFRESH_COOKIE, clearSession } from "@/server/session";

/**
 * Blacklists the refresh token upstream, then drops the cookies.
 *
 * The local cookies are cleared even when the upstream call fails: a customer
 * who clicked "sign out" must end up signed out of this browser regardless.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (refresh) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(access ? { authorization: `Bearer ${access}` } : {}),
        },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
      });
    } catch {
      // Ignored on purpose — see the note above.
    }
  }

  const response = new NextResponse(null, { status: 204 });
  clearSession(response);
  return response;
}
