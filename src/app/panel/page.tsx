"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Money, PageHeader } from "@/components/ui/misc";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { daysFromNow, formatDate, localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useCredit, useInvoices, useProfile, useServices, useTickets } from "@/lib/query/hooks";
import { cn } from "@/lib/utils/cn";

/**
 * Dashboard.
 *
 * Five independent reads (profile, active services, unpaid invoices, open
 * tickets, credit) are issued as five hooks, which React Query fires
 * concurrently — the page is never gated on the slowest one, and each tile
 * resolves its own loading and error state instead of blanking the whole
 * screen. Above the tiles sits the only thing that is genuinely urgent: money
 * owed and services about to renew.
 */
export default function DashboardPage() {
  const { t, locale } = useI18n();

  const profile = useProfile();
  const services = useServices(1, "Active");
  const invoices = useInvoices(1, "Unpaid");
  const tickets = useTickets(1, "Open");
  const credit = useCredit();

  const firstName = profile.data?.first_name?.trim() || profile.data?.email?.split("@")[0] || "";

  const dueSoon = useMemo(
    () =>
      (services.data?.results ?? []).filter((service) => {
        const days = daysFromNow(service.next_due_date);
        return days !== null && days >= 0 && days <= 14;
      }),
    [services.data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          profile.isPending ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            t("dashboard.greeting", { name: firstName })
          )
        }
        description={t("dashboard.subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon="bi-hdd-rack"
          tone="brand"
          label={t("dashboard.activeServices")}
          value={services.data ? localizeDigits(String(services.data.count), locale) : null}
          loading={services.isPending}
          href="/panel/services"
        />
        <StatTile
          icon="bi-receipt"
          tone={invoices.data?.count ? "warning" : "neutral"}
          label={t("dashboard.unpaidInvoices")}
          value={invoices.data ? localizeDigits(String(invoices.data.count), locale) : null}
          loading={invoices.isPending}
          href="/panel/invoices?status=Unpaid"
        />
        <StatTile
          icon="bi-life-preserver"
          tone={tickets.data?.count ? "info" : "neutral"}
          label={t("dashboard.openTickets")}
          value={tickets.data ? localizeDigits(String(tickets.data.count), locale) : null}
          loading={tickets.isPending}
          href="/panel/tickets?status=Open"
        />
        <StatTile
          icon="bi-wallet2"
          tone="success"
          label={t("dashboard.credit")}
          value={credit.data ? <Money value={credit.data.balance} /> : null}
          loading={credit.isPending}
        />
      </div>

      {dueSoon.length ? (
        <Card className="border-warning-500/30 flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="flex items-center gap-2.5 text-sm">
            <i className="bi bi-calendar-event text-warning-500" aria-hidden />
            <span className="font-medium">{t("dashboard.dueSoon")}</span>
            <span className="text-muted">
              {t("dashboard.dueSoonBody", { count: localizeDigits(String(dueSoon.length), locale) })}
            </span>
          </p>
          <ButtonLink href="/panel/services" size="sm" variant="secondary">
            {t("dashboard.viewAll")}
          </ButtonLink>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon="bi-hdd-rack"
            title={t("dashboard.recentServices")}
            action={
              <Link href="/panel/services" className="text-brand-600 dark:text-brand-300 text-xs hover:underline">
                {t("dashboard.viewAll")}
              </Link>
            }
          />
          <div className="p-5 pt-4 sm:p-6 sm:pt-4">
            {services.isPending ? (
              <RowsSkeleton />
            ) : services.isError ? (
              <ErrorState error={services.error} onRetry={() => services.refetch()} className="py-6" />
            ) : !services.data.results.length ? (
              <EmptyState
                icon="bi-hdd-rack"
                title={t("services.empty")}
                className="py-6"
                action={
                  <ButtonLink href="/plans" size="sm" icon="bi-bag-plus">
                    {t("services.emptyCta")}
                  </ButtonLink>
                }
              />
            ) : (
              <ul className="space-y-1">
                {services.data.results.slice(0, 4).map((service) => (
                  <li key={service.id}>
                    <Link
                      href={`/panel/services/${service.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--field-bg)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{service.name}</p>
                        <p className="text-faint truncate text-xs" dir="ltr">
                          {service.domain || "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <StatusBadge status={service.status} />
                        <p className="text-faint mt-1 text-xs">
                          {formatDate(service.next_due_date, locale)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            icon="bi-receipt"
            title={t("dashboard.recentInvoices")}
            action={
              <Link href="/panel/invoices" className="text-brand-600 dark:text-brand-300 text-xs hover:underline">
                {t("dashboard.viewAll")}
              </Link>
            }
          />
          <div className="p-5 pt-4 sm:p-6 sm:pt-4">
            {invoices.isPending ? (
              <RowsSkeleton />
            ) : invoices.isError ? (
              <ErrorState error={invoices.error} onRetry={() => invoices.refetch()} className="py-6" />
            ) : !invoices.data.results.length ? (
              <EmptyState icon="bi-check2-circle" title={t("invoices.empty")} className="py-6" />
            ) : (
              <ul className="space-y-1">
                {invoices.data.results.slice(0, 4).map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      href={`/panel/invoices/${invoice.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--field-bg)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          #{localizeDigits(invoice.number || String(invoice.id), locale)}
                        </p>
                        <p className="text-faint text-xs">{formatDate(invoice.due_date, locale)}</p>
                      </div>
                      <div className="shrink-0 text-end">
                        <Money value={invoice.total} currencyCode={invoice.currency_code} />
                        <div className="mt-1">
                          <StatusBadge status={invoice.status} />
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader icon="bi-lightning-charge" title={t("dashboard.quickActions")} />
        <div className="flex flex-wrap gap-3 p-5 pt-4 sm:p-6 sm:pt-4">
          <ButtonLink href="/panel/tickets/new" variant="secondary" icon="bi-plus-lg">
            {t("dashboard.newTicket")}
          </ButtonLink>
          <ButtonLink href="/plans" variant="secondary" icon="bi-hdd-rack">
            {t("dashboard.buyHosting")}
          </ButtonLink>
          <ButtonLink href="/domains" variant="secondary" icon="bi-globe2">
            {t("dashboard.registerDomain")}
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  loading,
  href,
  tone,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  loading: boolean;
  href?: string;
  tone: "brand" | "warning" | "info" | "success" | "neutral";
}) {
  const tones: Record<typeof tone, string> = {
    brand: "from-brand-500/15 to-brand-500/5 text-brand-600 dark:text-brand-300",
    warning: "from-warning-500/15 to-warning-500/5 text-warning-600 dark:text-warning-400",
    info: "from-accent-500/15 to-accent-500/5 text-accent-600 dark:text-accent-300",
    success: "from-success-500/15 to-success-500/5 text-success-600 dark:text-success-400",
    neutral: "from-[var(--field-bg)] to-transparent text-muted",
  };

  const body = (
    <motion.div
      whileHover={href ? { y: -2 } : undefined}
      className="glass flex h-full items-center gap-4 rounded-3xl p-5"
    >
      <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br", tones[tone])}>
        <i className={cn("bi text-xl", icon)} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-muted text-xs">{label}</p>
        <div className="mt-1 text-lg font-bold">
          {loading ? <Skeleton className="h-6 w-16" /> : (value ?? "—")}
        </div>
      </div>
    </motion.div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

function RowsSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
