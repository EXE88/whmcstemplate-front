"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { SessionUser } from "@/lib/api/types";

interface SessionValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signUp: (payload: Record<string, string>) => Promise<SessionUser>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Client-side identity only.
 *
 * The real credentials are httpOnly cookies the browser cannot read; `user`
 * here comes from a companion cookie carrying just the email and client id, so
 * the shell can render the right navigation without waiting on a request.
 */
export function SessionProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(initialUser);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setUser(result.user);
    return result.user;
  }, []);

  const signUp = useCallback(async (payload: Record<string, string>) => {
    const result = await authApi.register(payload);
    setUser(result.user);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      router.replace("/");
      router.refresh();
    }
  }, [router]);

  // A dead refresh token surfaces as one event from the transport layer,
  // wherever in the app it happened.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?expired=1&next=${next}`);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [router]);

  const value = useMemo<SessionValue>(
    () => ({ user, isAuthenticated: Boolean(user), signIn, signUp, signOut }),
    [user, signIn, signUp, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}
