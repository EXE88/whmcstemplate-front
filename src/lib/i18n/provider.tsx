"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dirOf, type Locale } from "./config";
import { en } from "./dictionaries/en";
import { fa, type TranslationKey } from "./dictionaries/fa";

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { fa, en };

export type Translate = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

interface I18nValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Translate;
  setLocale: (next: Locale) => void;
  /** Translate a WHMCS status/priority string, falling back to the raw value. */
  ts: (prefix: "status" | "priority" | "cycle", value: string | null | undefined) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = useCallback<Translate>(
    (key, vars) => {
      const dictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
      let text = dictionary[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [locale],
  );

  const ts = useCallback<I18nValue["ts"]>(
    (prefix, value) => {
      if (!value) return "—";
      const key = `${prefix}.${value}` as TranslationKey;
      const dictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
      return dictionary[key] ?? value;
    },
    [locale],
  );

  const setLocale = useCallback((next: Locale) => {
    // A cookie rather than a URL segment: the panel is one app, and this keeps
    // every route free of a locale prefix. The server layout reads it back.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, dir: dirOf(locale), t, ts, setLocale }),
    [locale, t, ts, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}
