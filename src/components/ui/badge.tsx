"use client";

import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils/cn";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONES: Record<Tone, string> = {
  neutral: "bg-[var(--field-bg)] text-muted border-[var(--field-border)]",
  success: "bg-success-500/12 text-success-600 dark:text-success-400 border-success-500/25",
  warning: "bg-warning-500/12 text-warning-600 dark:text-warning-400 border-warning-500/25",
  danger: "bg-danger-500/12 text-danger-600 dark:text-danger-400 border-danger-500/25",
  info: "bg-accent-500/12 text-accent-600 dark:text-accent-300 border-accent-500/25",
  brand: "bg-brand-500/12 text-brand-600 dark:text-brand-300 border-brand-500/25",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {icon ? <i className={cn("bi text-[0.9em]", icon)} aria-hidden /> : null}
      {children}
    </span>
  );
}

/** WHMCS status strings mapped onto tones once, so colours stay consistent. */
const STATUS_TONES: Record<string, Tone> = {
  Active: "success",
  Completed: "success",
  Paid: "success",
  Open: "success",
  Answered: "info",
  "Customer-Reply": "warning",
  "In Progress": "info",
  "On Hold": "warning",
  Pending: "warning",
  Unpaid: "warning",
  Draft: "neutral",
  Overdue: "danger",
  Suspended: "danger",
  Fraud: "danger",
  Terminated: "neutral",
  Cancelled: "neutral",
  Closed: "neutral",
  Refunded: "info",
  Collections: "danger",
  Expired: "danger",
};

const STATUS_ICONS: Record<Tone, string> = {
  success: "bi-check-circle-fill",
  warning: "bi-clock-fill",
  danger: "bi-exclamation-triangle-fill",
  info: "bi-info-circle-fill",
  neutral: "bi-dash-circle",
  brand: "bi-circle-fill",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const { ts } = useI18n();
  if (!status) return <span className="text-faint">—</span>;
  const tone = STATUS_TONES[status] ?? "neutral";
  return (
    <Badge tone={tone} icon={STATUS_ICONS[tone]} className={className}>
      {ts("status", status)}
    </Badge>
  );
}
