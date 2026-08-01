"use client";

import Link from "next/link";
import { useState } from "react";
import { ListShell } from "@/components/panel/list-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Money, PageHeader } from "@/components/ui/misc";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { compareDecimal } from "@/lib/format";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useCredit, useTransactions } from "@/lib/query/hooks";

/**
 * Transactions and credit share a page: both answer "where did my money go",
 * and splitting them across two nav entries made the customer hunt.
 */
export default function TransactionsPage() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const query = useTransactions(page);
  const credit = useCredit();

  return (
    <div className="space-y-5">
      <PageHeader icon="bi-arrow-left-right" title={t("transactions.title")} />

      <Card>
        <CardHeader icon="bi-wallet2" title={t("credit.title")} />
        <CardBody className="pt-3">
          {credit.isPending ? (
            <Skeleton className="h-7 w-32" />
          ) : credit.isError ? (
            <ErrorState error={credit.error} onRetry={() => credit.refetch()} className="py-4" />
          ) : (
            <>
              <Money
                value={credit.data.balance}
                currencyCode={credit.data.currency_code}
                emphasise
                className="text-success-600 dark:text-success-400"
              />
              {credit.data.entries.length ? (
                <ul className="mt-4">
                  {credit.data.entries.slice(0, 5).map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 border-b border-[var(--field-border)] py-2.5 text-sm last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate">{entry.description || "—"}</p>
                        <p className="text-faint text-xs">{formatDate(entry.date, locale)}</p>
                      </div>
                      <Money value={entry.amount} currencyCode={credit.data.currency_code} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-faint mt-3 text-sm">{t("credit.empty")}</p>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <ListShell
        query={query}
        onPageChange={setPage}
        empty={{ icon: "bi-arrow-left-right", title: t("transactions.empty") }}
      >
        {(transactions) => (
          <ul className="space-y-3">
            {transactions.map((transaction) => {
              const isIncoming = compareDecimal(transaction.amount_in ?? "0", "0") > 0;
              return (
                <li key={transaction.id}>
                  <Card className="flex flex-wrap items-center gap-4 p-5">
                    <span
                      className={
                        isIncoming
                          ? "bg-success-500/12 text-success-500 grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                          : "bg-danger-500/12 text-danger-500 grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                      }
                    >
                      <i
                        className={`bi ${isIncoming ? "bi-arrow-down-left" : "bi-arrow-up-right"} text-lg`}
                        aria-hidden
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {transaction.description || transaction.gateway || "—"}
                      </p>
                      <p className="text-faint text-xs">{formatDate(transaction.date, locale)}</p>
                    </div>

                    {transaction.invoice_id ? (
                      <Link
                        href={`/panel/invoices/${transaction.invoice_id}`}
                        className="text-brand-600 dark:text-brand-300 text-xs hover:underline"
                      >
                        {t("invoices.title")} #{transaction.invoice_id}
                      </Link>
                    ) : null}

                    <div className="text-end">
                      <Money
                        value={isIncoming ? transaction.amount_in : transaction.amount_out}
                        currencyCode={transaction.currency}
                      />
                      <p className="text-faint text-xs">
                        {isIncoming ? t("transactions.in") : t("transactions.out")}
                      </p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </ListShell>
    </div>
  );
}
