"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  badge?: string;
}

/**
 * Radio-group tabs with a sliding indicator. Used for billing periods and every
 * list filter, so one interaction pattern covers both.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel: string;
}) {
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "glass inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative whitespace-nowrap rounded-xl font-medium transition-colors duration-200",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              active ? "text-white" : "text-muted hover:text-[var(--page-fg)]",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`segmented-${groupId}`}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="from-brand-600 to-brand-500 shadow-brand-500/30 absolute inset-0 rounded-xl bg-gradient-to-l shadow-md"
              />
            ) : null}
            <span className="relative flex items-center gap-1.5">
              {option.label}
              {option.badge ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    active ? "bg-white/20" : "bg-brand-500/15 text-brand-600 dark:text-brand-300",
                  )}
                >
                  {option.badge}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
