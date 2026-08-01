"use client";

import { forwardRef, useId, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface FieldShellProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export function FieldShell({
  label,
  hint,
  error,
  required,
  className,
  htmlFor,
  children,
}: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required ? <span className="text-danger-500 px-1">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-danger-500 flex items-center gap-1.5 text-xs" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-faint text-xs leading-5">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "field w-full rounded-xl px-3.5 text-sm outline-none placeholder:text-[var(--faint-fg)] disabled:opacity-60";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  icon?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, className, wrapperClassName, id, required, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
      className={wrapperClassName}
    >
      <div className="relative">
        {icon ? (
          <i
            className={cn(
              "bi text-faint pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm ltr:left-3.5 rtl:right-3.5",
              icon,
            )}
            aria-hidden
          />
        ) : null}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(
            CONTROL,
            "h-11",
            icon && "ltr:pl-10 rtl:pr-10",
            error && "border-danger-500/60 focus:border-danger-500",
            className,
          )}
          {...props}
        />
      </div>
    </FieldShell>
  );
});

export const PasswordInput = forwardRef<HTMLInputElement, InputProps & { toggleLabels?: [string, string] }>(
  function PasswordInput({ toggleLabels = ["Show", "Hide"], className, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("ltr:pr-11 rtl:pl-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? toggleLabels[1] : toggleLabels[0]}
          className="text-faint hover:text-[var(--page-fg)] absolute top-[34px] rounded-lg p-1.5 transition-colors ltr:right-2 rtl:left-2"
        >
          <i className={cn("bi", visible ? "bi-eye-slash" : "bi-eye")} aria-hidden />
        </button>
      </div>
    );
  },
);

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, required, ...props },
  ref,
) {
  const generated = useId();
  const textareaId = id ?? generated;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={textareaId}>
      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(
          CONTROL,
          "min-h-32 resize-y py-3 leading-7",
          error && "border-danger-500/60",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, children, id, required, ...props },
  ref,
) {
  const generated = useId();
  const selectId = id ?? generated;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={selectId}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(
            CONTROL,
            "h-11 appearance-none bg-[var(--field-bg)] ltr:pr-9 rtl:pl-9",
            error && "border-danger-500/60",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <i
          className="bi bi-chevron-down text-faint pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs ltr:right-3 rtl:left-3"
          aria-hidden
        />
      </div>
    </FieldShell>
  );
});

export function Checkbox({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        className="accent-brand-500 mt-1 h-4 w-4 shrink-0 cursor-pointer rounded"
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-6 select-none">
        {label}
        {hint ? <span className="text-faint block text-xs leading-5">{hint}</span> : null}
      </label>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50",
        checked ? "bg-brand-500" : "bg-[var(--field-border)]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
          checked ? "ltr:left-[22px] rtl:right-[22px]" : "ltr:left-0.5 rtl:right-0.5",
        )}
      />
    </button>
  );
}
