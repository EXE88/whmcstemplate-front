"use client";

import { useState } from "react";
import { moneyParts } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils/cn";

/** Renders an amount string. Never accepts a `number` — see `lib/format`. */
export function Money({
  value,
  currencyCode,
  className,
  unitClassName,
  emphasise = false,
}: {
  value: string | null | undefined;
  currencyCode?: string | null;
  className?: string;
  unitClassName?: string;
  emphasise?: boolean;
}) {
  const { locale } = useI18n();
  const parts = moneyParts(value, locale, { currencyCode });
  return (
    <span className={cn("tnum inline-flex items-baseline gap-1", className)}>
      <span className={emphasise ? "text-lg font-bold sm:text-xl" : undefined}>{parts.amount}</span>
      <span className={cn("text-faint text-xs font-normal", unitClassName)}>{parts.unit}</span>
    </span>
  );
}

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* Clipboard denied — the value is still selectable on screen. */
        }
      }}
      aria-label={label ?? t("common.copy")}
      className={cn(
        "text-faint inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)]",
        className,
      )}
    >
      <i className={cn("bi", copied ? "bi-check2 text-success-500" : "bi-clipboard")} aria-hidden />
      {copied ? t("common.copied") : t("common.copy")}
    </button>
  );
}

export function PageHeader({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="from-brand-500/15 to-accent-500/15 text-brand-600 dark:text-brand-300 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br">
            <i className={cn("bi text-xl", icon)} aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">{title}</h1>
          {description ? (
            <p className="text-muted mt-0.5 text-sm leading-6">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}

/**
 * The soft moving light behind every page. Purely decorative and `aria-hidden`;
 * it is what makes the glass panels read as glass.
 */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div
        className="animate-[float_18s_ease-in-out_infinite] absolute -top-40 h-[38rem] w-[38rem] rounded-full blur-[120px] ltr:-left-32 rtl:-right-32"
        style={{ background: "var(--aurora-1)", opacity: "var(--aurora-alpha)" }}
      />
      <div
        className="animate-[float_22s_ease-in-out_infinite_reverse] absolute top-1/3 h-[30rem] w-[30rem] rounded-full blur-[130px] ltr:right-0 rtl:left-0"
        style={{ background: "var(--aurora-2)", opacity: "calc(var(--aurora-alpha) * 0.8)" }}
      />
      <div
        className="animate-[float_26s_ease-in-out_infinite] absolute -bottom-52 left-1/3 h-[34rem] w-[34rem] rounded-full blur-[140px]"
        style={{ background: "var(--aurora-3)", opacity: "calc(var(--aurora-alpha) * 0.7)" }}
      />
    </div>
  );
}

/** Fades content in as it mounts; keeps route transitions from snapping. */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("motion-safe:animate-[fadeUp_0.5s_cubic-bezier(0.22,1,0.36,1)_both]", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
