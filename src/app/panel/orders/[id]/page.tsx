"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DataRow } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Money, PageHeader } from "@/components/ui/misc";
import { ErrorBanner, ErrorState, SkeletonCard } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { formatDate, localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useCancelOrder, useOrder } from "@/lib/query/hooks";
import { safeExternalUrl } from "@/lib/utils/safe-redirect";

/**
 * Order detail.
 *
 * Cancellation is offered only while the order is `Pending` — the bridge
 * enforces that too, but showing a button that always fails would be a lie.
 */
export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { t, ts, locale } = useI18n();
  const toast = useToast();

  const order = useOrder(id);
  const cancel = useCancelOrder();
  const [confirming, setConfirming] = useState(false);

  if (order.isPending) return <SkeletonCard rows={7} />;
  if (order.isError) {
    return (
      <Card>
        <ErrorState error={order.error} onRetry={() => order.refetch()} />
      </Card>
    );
  }

  const data = order.data;
  const cancellable = data.status === "Pending";
  const payUrl = safeExternalUrl(data.payment_url);

  return (
    <div className="space-y-5">
      <PageHeader
        icon="bi-bag-check"
        title={`${t("orders.number")} #${localizeDigits(data.order_number || String(data.id), locale)}`}
        description={formatDate(data.date, locale)}
        action={
          <ButtonLink href="/panel/orders" variant="ghost" size="sm" icon="bi-arrow-right">
            {t("common.back")}
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            icon="bi-list-ul"
            title={t("orders.items")}
            action={<StatusBadge status={data.status} />}
          />
          <CardBody className="pt-2">
            {data.items?.length ? (
              <ul>
                {data.items.map((item, index) => (
                  <li
                    key={`${item.relation_id}-${index}`}
                    className="flex items-start justify-between gap-4 border-b border-[var(--field-border)] py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.product || item.type}</p>
                      {item.domain ? (
                        <p className="text-faint truncate font-mono text-xs" dir="ltr">
                          {item.domain}
                        </p>
                      ) : null}
                      {item.billing_cycle ? (
                        <p className="text-faint text-xs">{ts("cycle", item.billing_cycle)}</p>
                      ) : null}
                    </div>
                    <Money value={item.amount} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-faint py-6 text-center text-sm">{t("empty.title")}</p>
            )}
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader icon="bi-info-circle" title={t("common.details")} />
          <CardBody className="pt-2">
            <DataRow label={t("common.total")} value={<Money value={data.amount} emphasise />} />
            <DataRow label={t("orders.paymentStatus")} value={<StatusBadge status={data.payment_status} />} />
            <DataRow label={t("checkout.paymentMethod")} value={data.payment_method || "—"} />
            {data.invoice_id ? (
              <DataRow
                label={t("invoices.number")}
                value={
                  <ButtonLink href={`/panel/invoices/${data.invoice_id}`} variant="ghost" size="sm">
                    #{localizeDigits(String(data.invoice_id), locale)}
                  </ButtonLink>
                }
              />
            ) : null}

            <div className="mt-4 space-y-2">
              {payUrl && data.payment_status !== "Paid" ? (
                <Button
                  fullWidth
                  icon="bi-credit-card"
                  onClick={() => {
                    window.location.href = payUrl;
                  }}
                >
                  {t("invoices.pay")}
                </Button>
              ) : null}

              {cancellable ? (
                <Button
                  fullWidth
                  variant="ghost"
                  icon="bi-x-circle"
                  className="text-danger-500"
                  onClick={() => setConfirming(true)}
                >
                  {t("orders.cancel")}
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        icon="bi-x-circle"
        title={t("orders.cancel")}
        description={t("orders.cancelConfirm")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={cancel.isPending}
              onClick={() =>
                cancel.mutate(id, {
                  onSuccess: () => {
                    setConfirming(false);
                    toast.success(t("orders.cancelled"));
                  },
                })
              }
            >
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        {cancel.isError ? <ErrorBanner error={cancel.error} /> : null}
      </Modal>
    </div>
  );
}
