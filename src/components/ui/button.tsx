"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-l from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:brightness-110 active:brightness-95",
  secondary:
    "glass text-[var(--page-fg)] hover:bg-[var(--glass-bg-strong)] hover:border-brand-400/50",
  ghost: "text-muted hover:text-[var(--page-fg)] hover:bg-[var(--field-bg)]",
  danger:
    "bg-gradient-to-l from-danger-600 to-danger-500 text-white shadow-lg shadow-danger-500/20 hover:brightness-110",
  subtle: "bg-brand-500/10 text-brand-600 dark:text-brand-300 hover:bg-brand-500/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-13 px-7 text-base gap-2.5 rounded-2xl",
};

const BASE =
  "inline-flex items-center justify-center font-medium transition-all duration-200 select-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none " +
  "active:scale-[0.98] whitespace-nowrap";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconEnd?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

export type ButtonProps = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    icon,
    iconEnd,
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...props}
    >
      {loading ? (
        <i className="bi bi-arrow-repeat animate-spin" aria-hidden />
      ) : icon ? (
        <i className={cn("bi", icon)} aria-hidden />
      ) : null}
      {children}
      {iconEnd && !loading ? <i className={cn("bi", iconEnd)} aria-hidden /> : null}
    </button>
  );
});

export type ButtonLinkProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "className"> & { className?: string };

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...props}
    >
      {icon ? <i className={cn("bi", icon)} aria-hidden /> : null}
      {children}
      {iconEnd ? <i className={cn("bi", iconEnd)} aria-hidden /> : null}
    </Link>
  );
}

/** Square icon-only button; `label` becomes the accessible name. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  { icon: string; label: string } & React.ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: Variant;
      size?: Size;
    }
>(function IconButton({ icon, label, variant = "ghost", size = "md", className, ...props }, ref) {
  const box = size === "sm" ? "h-9 w-9 text-sm" : size === "lg" ? "h-12 w-12 text-lg" : "h-10 w-10";
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        BASE,
        VARIANTS[variant],
        "rounded-xl p-0",
        box,
        className,
      )}
      {...props}
    >
      <i className={cn("bi", icon)} aria-hidden />
    </button>
  );
});
