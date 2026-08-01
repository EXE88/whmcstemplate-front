"use client";

import Link from "next/link";
import { useState } from "react";
import { ListShell } from "@/components/panel/list-shell";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Money, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import type { InvoiceStatus } from "@/lib/api/types";
import { daysFromNow, formatDate, localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useInvoices } from "@/lib/query/hooks";

const FILTERS: Array<InvoiceStatus | ""> = ["", "Unpaid", "Paid", "Overdue", "Cancelled", "Refunded"];

export default function InvoicesPage() {
  const { t, ts, locale } = useI18n();
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [page, setPage] = useState(1);
  const query = useInvoices(page, status);

  return (
    <div className="space-y-5">
      <PageHeader icon="bi-receipt" title={t("invoices.title")} />

      <Segmented
        ariaLabel={t("common.filter")}
        size="sm"
        value={status}
        onChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
        options={FILTERS.map((value) => ({
          value,
          label: value ? ts("status", value) : t("common.all"),
        }))}
      />

      <ListShell
        query={query}
        onPageChange={setPage}
        empty={{ icon: "bi-receipt", title: t("invoices.empty") }}
      >
        {(invoices) => (
          <ul className="space-y-3">
            {invoices.map((invoice) => {
              const overdueDays = invoice.status === "Overdue" ? daysFromNow(invoice.due_date) : null;

              return (
                <li key={invoice.id}>
                  <Link href={`/panel/invoices/${invoice.id}`} className="block">
                    <Card className="hover:border-brand-400/50 flex flex-wrap items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5">
                      <span className="bg-brand-500/12 text-brand-600 dark:text-brand-300 grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
                        <i className="bi bi-receipt text-lg" aria-hidden />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="tnum truncate font-semibold">
                          #{localizeDigits(invoice.number || String(invoice.id), locale)}
                        </p>
                        <p className="text-faint text-xs">
                          {t("common.date")}: {formatDate(invoice.date, locale)}
                        </p>
                      </div>

                      <div className="text-end">
                        <p className="text-faint text-xs">{t("invoices.dueDate")}</p>
                        <p className="text-sm font-medium">{formatDate(invoice.due_date, locale)}</p>
                        {overdueDays !== null && overdueDays < 0 ? (
                          <p className="text-danger-500 text-xs">
                            {t("invoices.overdueBy", {
                              count: localizeDigits(String(Math.abs(overdueDays)), locale),
                            })}
                          </p>
                        ) : null}
                      </div>

                      <Money value={invoice.total} currencyCode={invoice.currency_code} emphasise />
                      <StatusBadge status={invoice.status} />
                      <i className="bi bi-chevron-left text-faint ltr:rotate-180" aria-hidden />
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
