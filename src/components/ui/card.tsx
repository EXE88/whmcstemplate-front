import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  children,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" | "li" }) {
  return (
    <Tag className={cn("glass rounded-3xl", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({
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
    <div className={cn("flex items-start justify-between gap-4 p-5 pb-0 sm:p-6 sm:pb-0", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="bg-brand-500/12 text-brand-600 dark:text-brand-300 grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
            <i className={cn("bi text-lg", icon)} aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold sm:text-lg">{title}</h2>
          {description ? (
            <p className="text-muted mt-0.5 text-sm leading-6">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5 sm:p-6", className)}>{children}</div>;
}

/** Key/value row used across every detail page. */
export function DataRow({
  label,
  value,
  icon,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-[var(--field-border)] py-3 last:border-0",
        className,
      )}
    >
      <span className="text-muted flex items-center gap-2 text-sm">
        {icon ? <i className={cn("bi text-faint", icon)} aria-hidden /> : null}
        {label}
      </span>
      <span className="tnum min-w-0 truncate text-sm font-medium">{value}</span>
    </div>
  );
}
