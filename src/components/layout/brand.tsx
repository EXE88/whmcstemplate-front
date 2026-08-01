"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? "LithiumHost";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label={BRAND_NAME}>
      <span className="from-brand-500 to-accent-500 shadow-brand-500/30 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-105">
        <i className="bi bi-hdd-stack-fill text-base text-white" aria-hidden />
      </span>
      {compact ? null : (
        <span className="leading-tight">
          <span className="block text-sm font-bold tracking-tight">{BRAND_NAME}</span>
          <span className="text-faint block text-[10px]">{t("brand.tagline")}</span>
        </span>
      )}
    </Link>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("theme.toggle")}
      title={theme === "dark" ? t("theme.light") : t("theme.dark")}
      className={cn(
        "text-muted grid h-10 w-10 place-items-center rounded-xl transition-all duration-200 hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)]",
        className,
      )}
    >
      <i
        className={cn("bi text-base transition-transform duration-300", theme === "dark" ? "bi-sun" : "bi-moon-stars")}
        aria-hidden
      />
    </button>
  );
}

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const next: Locale = locale === "fa" ? "en" : "fa";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={t("locale.toggle")}
      title={LOCALE_LABELS[next]}
      className={cn(
        "text-muted flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition-all duration-200 hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)]",
        className,
      )}
    >
      <i className="bi bi-translate text-base" aria-hidden />
      <span>{next === "fa" ? "فا" : "EN"}</span>
    </button>
  );
}
