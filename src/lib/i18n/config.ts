export const LOCALES = ["fa", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fa";
export const LOCALE_COOKIE = "lh_locale";
export const THEME_COOKIE = "lh_theme";

export type Theme = "light" | "dark";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "fa" ? "rtl" : "ltr";
}

export const LOCALE_LABELS: Record<Locale, string> = {
  fa: "فارسی",
  en: "English",
};
