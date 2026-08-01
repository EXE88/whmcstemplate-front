import "server-only";

import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/api/types";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  THEME_COOKIE,
  isLocale,
  type Locale,
  type Theme,
} from "@/lib/i18n/config";
import { USER_COOKIE, parseUserCookie } from "./session";

export interface RequestContext {
  locale: Locale;
  theme: Theme;
  user: SessionUser | null;
}

/**
 * Locale and theme are resolved on the server from cookies so the very first
 * HTML already has the right `dir`, `lang` and `.dark` class — no flash, no
 * layout shift when the client hydrates.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const store = await cookies();
  const rawLocale = store.get(LOCALE_COOKIE)?.value;
  const rawTheme = store.get(THEME_COOKIE)?.value;

  return {
    locale: isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE,
    theme: rawTheme === "light" ? "light" : "dark",
    user: parseUserCookie(store.get(USER_COOKIE)?.value),
  };
}
