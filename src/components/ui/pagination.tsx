"use client";

import { localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils/cn";

/**
 * Page controls for the bridge's `{count, page, num_pages, results}` envelope.
 * Direction-aware: the "next" chevron points the way the language reads.
 */
export function Pagination({
  page,
  numPages,
  count,
  onChange,
  className,
}: {
  page: number;
  numPages: number;
  count: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const { t, locale, dir } = useI18n();
  if (numPages <= 1) return null;

  const pages = pageWindow(page, numPages);
  const prevIcon = dir === "rtl" ? "bi-chevron-right" : "bi-chevron-left";
  const nextIcon = dir === "rtl" ? "bi-chevron-left" : "bi-chevron-right";

  return (
    <nav
      className={cn("flex flex-wrap items-center justify-between gap-3 pt-4", className)}
      aria-label={t("common.page")}
    >
      <p className="text-faint text-xs">
        {localizeDigits(String(count), locale)} {t("common.results")}
      </p>
      <div className="flex items-center gap-1">
        <PageButton
          icon={prevIcon}
          label={t("common.previous")}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        />
        {pages.map((entry, index) =>
          entry === null ? (
            <span key={`gap-${index}`} className="text-faint px-1 text-xs">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onChange(entry)}
              aria-current={entry === page ? "page" : undefined}
              className={cn(
                "tnum h-9 min-w-9 rounded-xl px-2.5 text-xs font-medium transition-colors",
                entry === page
                  ? "bg-brand-500 text-white shadow-brand-500/25 shadow-md"
                  : "text-muted hover:bg-[var(--field-bg)]",
              )}
            >
              {localizeDigits(String(entry), locale)}
            </button>
          ),
        )}
        <PageButton
          icon={nextIcon}
          label={t("common.next")}
          disabled={page >= numPages}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </nav>
  );
}

function PageButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="text-muted grid h-9 w-9 place-items-center rounded-xl transition-colors hover:bg-[var(--field-bg)] disabled:pointer-events-none disabled:opacity-40"
    >
      <i className={cn("bi text-xs", icon)} aria-hidden />
    </button>
  );
}

/** `1 … 4 5 6 … 12` — never more than seven slots. */
function pageWindow(page: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const slots = new Set<number>([1, total, page, page - 1, page + 1]);
  const sorted = [...slots].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);

  const out: Array<number | null> = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) out.push(null);
    out.push(value);
    previous = value;
  }
  return out;
}
