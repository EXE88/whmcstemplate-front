"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils/cn";

/**
 * Focus-trapping dialog. Escape and backdrop clicks close it, focus returns to
 * whatever opened it, and the page behind stops scrolling.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute("disabled"));

    const timer = setTimeout(() => focusable()[0]?.focus(), 40);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  const width = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-[rgb(6_8_20/0.55)] backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "glass-strong relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl sm:rounded-3xl",
              width,
            )}
          >
            <div className="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-3">
              <div className="flex min-w-0 items-start gap-3">
                {icon ? (
                  <span className="bg-brand-500/12 text-brand-600 dark:text-brand-300 grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
                    <i className={cn("bi text-lg", icon)} aria-hidden />
                  </span>
                ) : null}
                <div className="min-w-0">
                  <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
                  {description ? (
                    <p className="text-muted mt-1 text-sm leading-6">{description}</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="text-faint shrink-0 rounded-xl p-2 transition-colors hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)]"
              >
                <i className="bi bi-x-lg text-sm" aria-hidden />
              </button>
            </div>

            {children ? <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div> : null}
            {footer ? (
              <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--field-border)] p-4 sm:px-6">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
