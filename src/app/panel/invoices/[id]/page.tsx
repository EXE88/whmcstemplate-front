"use client";

import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DataRow } from "@/components/ui/card";
import { Money, PageHeader } from "@/components/ui/misc";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui/states";
import { formatDate, localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useInvoice } from "@/lib/query/hooks";

/**
 * Invoice detail.
 *
 * Paying is a redirect to `payment_url`, which the bridge only includes while
 * the invoice is actually payable — so the button's existence is driven by the
 * API rather than by a status string we interpret ourselves.
 */
export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { t, locale } = useI18n();
  const invoice = useInvoice(id);

  if (invoice.isPending) return <SkeletonCard rows={8} />;
  if (invoice.isError) {
    return (
      <Card>
        <ErrorState error={invoice.error} onRetry={() => invoice.refetch()} />
      </Card>
    );
  }

  const data = invoice.data;
  const items = data.items ?? [];
  const transactions = data.transactions ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        icon="bi-receipt"
        title={`${t("invoices.number")} #${localizeDigits(data.number || String(data.id), locale)}`}
        description={formatDate(data.date, locale)}
        action={
          <>
            <ButtonLink href="/panel/invoices" variant="ghost" size="sm" icon="bi-arrow-right">
              {t("common.back")}
            </ButtonLink>
            <Button
              variant="secondary"
              size="sm"
              icon="bi-printer"
              onClick={() => window.print()}
            >
              {t("invoices.print")}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            icon="bi-list-ul"
            title={t("invoices.items")}
            action={<StatusBadge status={data.status} />}
          />
          <CardBody className="pt-2">
            {items.length ? (
              <ul>
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 border-b border-[var(--field-border)] py-3 last:border-0"
                  >
                    <p className="min-w-0 flex-1 text-sm leading-6">{item.description}</p>
                    <Money value={item.amount} currencyCode={data.currency_code} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="bi-list-ul" title={t("empty.title")} className="py-8" />
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader icon="bi-calculator" title={t("common.total")} />
            <CardBody className="pt-2">
              <DataRow
                label={t("invoices.subtotal")}
                value={<Money value={data.subtotal} currencyCode={data.currency_code} />}
              />
              <DataRow
                label={t("invoices.tax")}
                value={<Money value={data.tax} currencyCode={data.currency_code} />}
              />
              <DataRow
                label={t("invoices.creditApplied")}
                value={<Money value={data.credit} currencyCode={data.currency_code} />}
              />
              <DataRow
                label={t("common.total")}
                value={<Money value={data.total} currencyCode={data.currency_code} emphasise />}
              />
              <DataRow label={t("invoices.dueDate")} value={formatDate(data.due_date, locale)} />
              {data.status === "Paid" ? (
                <DataRow label={t("invoices.datePaid")} value={formatDate(data.date_paid, locale)} />
              ) : null}

              {data.payment_url ? (
                <Button
                  className="mt-4"
                  fullWidth
                  size="lg"
                  icon="bi-credit-card"
                  onClick={() => {
                    window.location.href = data.payment_url!;
                  }}
                >
                  {t("invoices.pay")}
                </Button>
              ) : data.status === "Paid" ? (
                <p className="text-success-600 dark:text-success-400 mt-4 flex items-center justify-center gap-2 text-sm">
                  <i className="bi bi-check-circle-fill" aria-hidden />
                  {t("invoices.paid")}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon="bi-arrow-left-right" title={t("invoices.transactions")} />
            <CardBody className="pt-2">
              {transactions.length ? (
                <ul>
                  {transactions.map((transaction) => (
                    <li
                      key={transaction.id}
                      className="border-b border-[var(--field-border)] py-3 last:border-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">{transaction.gateway || "—"}</span>
                        <Money value={transaction.amount_in} currencyCode={transaction.currency} />
                      </div>
                      <p className="text-faint mt-0.5 text-xs">
                        {formatDate(transaction.date, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-faint py-4 text-center text-sm">{t("transactions.empty")}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
