"use client";

import Link from "next/link";
import { useState } from "react";
import { ListShell } from "@/components/panel/list-shell";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import type { ServiceStatus } from "@/lib/api/types";
import { daysFromNow, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useServices } from "@/lib/query/hooks";
import { cn } from "@/lib/utils/cn";

const FILTERS: Array<ServiceStatus | ""> = ["", "Active", "Pending", "Suspended", "Cancelled"];

export default function ServicesPage() {
  const { t, ts, locale } = useI18n();
  const [status, setStatus] = useState<ServiceStatus | "">("");
  const [page, setPage] = useState(1);

  const query = useServices(page, status);

  return (
    <div className="space-y-5">
      <PageHeader
        icon="bi-hdd-rack"
        title={t("services.title")}
        action={
          <ButtonLink href="/plans" size="sm" icon="bi-bag-plus">
            {t("dashboard.buyHosting")}
          </ButtonLink>
        }
      />

      <Segmented
        ariaLabel={t("common.filter")}
        value={status}
        onChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
        size="sm"
        options={FILTERS.map((value) => ({
          value,
          label: value ? ts("status", value) : t("common.all"),
        }))}
      />

      <ListShell
        query={query}
        onPageChange={setPage}
        empty={{
          icon: "bi-hdd-rack",
          title: t("services.empty"),
          action: (
            <ButtonLink href="/plans" icon="bi-bag-plus">
              {t("services.emptyCta")}
            </ButtonLink>
          ),
        }}
      >
        {(services) => (
          <ul className="space-y-3">
            {services.map((service) => {
              const days = daysFromNow(service.next_due_date);
              const urgent = days !== null && days >= 0 && days <= 7;

              return (
                <li key={service.id}>
                  <Link href={`/panel/services/${service.id}`} className="block">
                    <Card className="hover:border-brand-400/50 flex flex-wrap items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5">
                      <span className="bg-brand-500/12 text-brand-600 dark:text-brand-300 grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
                        <i className="bi bi-hdd-rack text-lg" aria-hidden />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{service.name}</p>
                        <p className="text-faint truncate text-xs" dir="ltr">
                          {service.domain || "—"}
                        </p>
                      </div>

                      <div className="text-end">
                        <Money value={service.amount} />
                        <p className="text-faint text-xs">{ts("cycle", service.billing_cycle)}</p>
                      </div>

                      <div className="text-end">
                        <p className={cn("text-xs", urgent ? "text-warning-600 dark:text-warning-400" : "text-faint")}>
                          {t("services.nextDue")}
                        </p>
                        <p className="text-sm font-medium">{formatDate(service.next_due_date, locale)}</p>
                      </div>

                      <StatusBadge status={service.status} />
                      <i className="bi bi-chevron-left text-faint rtl:rotate-0 ltr:rotate-180" aria-hidden />
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </ListShell>
    </div>
  );
}
