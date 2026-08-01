"use client";

import type { SessionUser } from "@/lib/api/types";
import type { Locale, Theme } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/provider";
import { QueryProvider } from "@/lib/query/provider";
import { SessionProvider } from "@/lib/session/provider";
import { ThemeProvider } from "@/lib/theme/provider";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Provider order matters: i18n and theme are read by everything below them,
 * session needs the router, and toasts need to sit outermost enough that a
 * mutation anywhere can raise one.
 */
export function Providers({
  locale,
  theme,
  user,
  children,
}: {
  locale: Locale;
  theme: Theme;
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return (
    <I18nProvider locale={locale}>
      <ThemeProvider initialTheme={theme}>
        <QueryProvider>
          <SessionProvider initialUser={user}>
            <ToastProvider>{children}</ToastProvider>
          </SessionProvider>
        </QueryProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
