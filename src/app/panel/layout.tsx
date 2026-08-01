import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PanelShell } from "@/components/layout/panel-shell";
import { REFRESH_COOKIE } from "@/server/session";

/**
 * Server-side gate.
 *
 * A missing refresh cookie means there is no session that could possibly be
 * revived, so the redirect happens before any panel JavaScript ships. Anything
 * subtler than that is the API's job: the bridge re-checks ownership on every
 * single call, so this is a UX guard, not the security boundary.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  if (!store.get(REFRESH_COOKIE)?.value) {
    redirect("/login?next=%2Fpanel");
  }

  return <PanelShell>{children}</PanelShell>;
}
