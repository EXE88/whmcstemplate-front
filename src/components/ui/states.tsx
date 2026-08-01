"use client";

import { ApiError } from "@/lib/api/errors";
import type { TranslationKey } from "@/lib/i18n/dictionaries/fa";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden />;
}

export function SkeletonCard({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("glass space-y-3 rounded-3xl p-5 sm:p-6", className)}>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className={index === rows - 1 ? "w-2/3" : "w-full"} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} rows={2} />
      ))}
    </div>
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="text-muted flex items-center justify-center gap-3 py-14 text-sm" aria-busy>
      <i className="bi bi-arrow-repeat animate-spin text-lg" aria-hidden />
      {label ?? t("common.loading")}
    </div>
  );
}

export function EmptyState({
  icon = "bi-inbox",
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="bg-brand-500/10 text-brand-500 grid h-16 w-16 place-items-center rounded-3xl">
        <i className={cn("bi text-2xl", icon)} aria-hidden />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="text-muted max-w-md text-sm leading-7">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Turn any thrown value into the localized message for its bridge error code. */
export function useErrorMessage() {
  const { t } = useI18n();
  return (error: unknown): { message: string; requestId: string | null } => {
    if (error instanceof ApiError) {
      const key = `error.${error.code}` as TranslationKey;
      const translated = t(key);
      const message =
        translated === key
          ? error.message || t("error.generic")
          : translated;
      return { message, requestId: error.requestId };
    }
    return { message: t("error.generic"), requestId: null };
  };
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  const describe = useErrorMessage();
  const { message, requestId } = describe(error);
  const status = error instanceof ApiError ? error.status : 0;

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}
      role="alert"
    >
      <span className="bg-danger-500/10 text-danger-500 grid h-16 w-16 place-items-center rounded-3xl">
        <i
          className={cn(
            "bi text-2xl",
            status === 0 ? "bi-wifi-off" : status === 504 ? "bi-hourglass-split" : "bi-exclamation-triangle",
          )}
          aria-hidden
        />
      </span>
      <h3 className="text-base font-semibold">{t("error.title")}</h3>
      <p className="text-muted max-w-md text-sm leading-7">{message}</p>
      {requestId ? (
        <p className="text-faint tnum font-mono text-xs">{t("error.requestId", { id: requestId })}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" icon="bi-arrow-clockwise" onClick={onRetry} className="mt-2">
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}

/** Inline banner for form-level failures. */
export function ErrorBanner({ error, className }: { error: unknown; className?: string }) {
  const { t } = useI18n();
  const describe = useErrorMessage();
  if (!error) return null;
  const { message, requestId } = describe(error);

  return (
    <div
      role="alert"
      className={cn(
        "bg-danger-500/10 border-danger-500/25 text-danger-600 dark:text-danger-300 flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm",
        className,
      )}
    >
      <i className="bi bi-exclamation-octagon-fill mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="leading-6">{message}</p>
        {requestId ? (
          <p className="mt-0.5 font-mono text-xs opacity-70">
            {t("error.requestId", { id: requestId })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
