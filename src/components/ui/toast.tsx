"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
  hint?: string;
}

interface ToastValue {
  push: (toast: Omit<Toast, "id">) => void;
  success: (message: string, hint?: string) => void;
  error: (message: string, hint?: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const TONE_STYLES: Record<ToastTone, { icon: string; accent: string }> = {
  success: { icon: "bi-check-circle-fill", accent: "text-success-500" },
  error: { icon: "bi-exclamation-octagon-fill", accent: "text-danger-500" },
  info: { icon: "bi-info-circle-fill", accent: "text-brand-500" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      setTimeout(() => dismiss(id), toast.tone === "error" ? 8000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo<ToastValue>(
    () => ({
      push,
      success: (message, hint) => push({ tone: "success", message, hint }),
      error: (message, hint) => push({ tone: "error", message, hint }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 ltr:left-0 rtl:right-0 sm:bottom-6"
        role="region"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="glass-strong pointer-events-auto flex items-start gap-3 rounded-2xl p-3.5"
            >
              <i
                className={cn("bi shrink-0 text-lg", TONE_STYLES[toast.tone].icon, TONE_STYLES[toast.tone].accent)}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-6">{toast.message}</p>
                {toast.hint ? (
                  <p className="text-muted mt-0.5 text-xs leading-5 break-words">{toast.hint}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-faint hover:text-[var(--page-fg)] shrink-0 rounded-lg p-1 transition-colors"
                aria-label="بستن"
              >
                <i className="bi bi-x-lg text-xs" aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
