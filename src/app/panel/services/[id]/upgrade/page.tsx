"use client";

import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DataRow } from "@/components/ui/card";
import { Money, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorBanner, ErrorState, LoadingBlock, SkeletonCard } from "@/components/ui/states";
import type { BillingCycle, Product, UpgradeQuote } from "@/lib/api/types";
import { availableCycles, priceOf } from "@/lib/catalog/pricing";
import { localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import {
  usePaymentMethods,
  useService,
  useUpgrade,
  useUpgradeOptions,
  useUpgradeQuote,
} from "@/lib/query/hooks";
import { cn } from "@/lib/utils/cn";

type Step = "plan" | "quote";

/**
 * Upgrade wizard.
 *
 * Three moves, in the order the money becomes real: pick a plan (nothing has
 * happened yet), see the pro-rata quote the bridge calculates (`calconly`, still
 * nothing has happened), then confirm — which is the first call that raises an
 * invoice, and is immediately followed by the redirect to pay it.
 *
 * The quote is discarded whenever the plan or the period changes, so the number
 * on screen always belongs to the selection on screen.
 */
export default function UpgradePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { t, ts, locale } = useI18n();
  const router = useRouter();

  const service = useService(id);
  const options = useUpgradeOptions(id);
  const gateways = usePaymentMethods();

  const [step, setStep] = useState<Step>("plan");
  const [productId, setProductId] = useState<number | null>(null);
  const [cycle, setCycle] = useState<BillingCycle | null>(null);
  const [quote, setQuote] = useState<UpgradeQuote | null>(null);

  const quoteMutation = useUpgradeQuote(id);
  const upgradeMutation = useUpgrade(id);

  const selected: Product | undefined = useMemo(
    () => options.data?.find((product) => product.id === productId),
    [options.data, productId],
  );

  const cycles = selected ? availableCycles(selected) : [];

  useEffect(() => {
    if (selected && (!cycle || !cycles.includes(cycle))) setCycle(cycles[0] ?? null);
  }, [selected, cycle, cycles]);

  // Any change to the selection invalidates a quote that was already fetched.
  const resetQuote = () => {
    setQuote(null);
    setStep("plan");
  };

  if (service.isPending || options.isPending) return <SkeletonCard rows={6} />;
  if (options.isError) {
    return (
      <Card>
        <ErrorState error={options.error} onRetry={() => options.refetch()} />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon="bi-arrow-up-circle"
        title={t("upgrade.title")}
        description={service.data?.name}
        action={
          <ButtonLink href={`/panel/services/${id}`} variant="ghost" size="sm" icon="bi-arrow-right">
            {t("common.back")}
          </ButtonLink>
        }
      />

      <Steps current={step} />

      {!options.data.length ? (
        <Card>
          <EmptyState icon="bi-slash-circle" title={t("upgrade.noOptions")} />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader icon="bi-grid" title={t("upgrade.choosePlan")} />
            <CardBody className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {options.data.map((product) => {
                const active = product.id === productId;
                const firstCycle = availableCycles(product)[0];
                const price = firstCycle ? priceOf(product, firstCycle) : null;

                return (
                  <button
                    key={product.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setProductId(product.id);
                      resetQuote();
                    }}
                    className={cn(
                      "rounded-2xl border p-4 text-start transition-all duration-200",
                      active
                        ? "border-brand-500 bg-brand-500/10 shadow-brand-500/15 shadow-lg"
                        : "border-[var(--field-border)] hover:border-brand-400/50 hover:bg-[var(--field-bg)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{product.name}</p>
                      {active ? (
                        <i className="bi bi-check-circle-fill text-brand-500" aria-hidden />
                      ) : null}
                    </div>
                    {price ? (
                      <p className="mt-2">
                        <Money value={price} />
                        <span className="text-faint ms-1 text-xs">{ts("cycle", firstCycle)}</span>
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </CardBody>
          </Card>

          {selected ? (
            <Card>
              <CardHeader icon="bi-calendar3" title={t("upgrade.chooseCycle")} />
              <CardBody className="space-y-4 pt-4">
                {cycles.length ? (
                  <Segmented
                    ariaLabel={t("upgrade.chooseCycle")}
                    value={cycle ?? cycles[0]}
                    onChange={(next) => {
                      setCycle(next);
                      resetQuote();
                    }}
                    options={cycles.map((value) => ({ value, label: ts("cycle", value) }))}
                  />
                ) : (
                  <p className="text-muted text-sm">{t("store.plans.noPriceForCycle")}</p>
                )}

                {quoteMutation.isError ? <ErrorBanner error={quoteMutation.error} /> : null}

                <Button
                  icon="bi-calculator"
                  loading={quoteMutation.isPending}
                  disabled={!cycle}
                  onClick={() =>
                    quoteMutation.mutate(
                      { new_product_id: selected.id, billing_cycle: cycle! },
                      {
                        onSuccess: (result) => {
                          setQuote(result);
                          setStep("quote");
                        },
                      },
                    )
                  }
                >
                  {quoteMutation.isPending ? t("upgrade.quoting") : t("upgrade.quote")}
                </Button>
              </CardBody>
            </Card>
          ) : null}

          {quote ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader icon="bi-receipt-cutoff" title={t("upgrade.priceDiff")} />
                <CardBody className="pt-2">
                  {quote.in_progress ? (
                    <div className="bg-warning-500/10 border-warning-500/25 text-warning-600 dark:text-warning-300 mb-4 flex items-center gap-2 rounded-2xl border p-3 text-sm">
                      <i className="bi bi-hourglass-split shrink-0" aria-hidden />
                      {t("upgrade.inProgress")}
                    </div>
                  ) : null}

                  <DataRow label={t("upgrade.from")} value={quote.old_product_name || "—"} />
                  <DataRow label={t("upgrade.to")} value={quote.new_product_name || "—"} />
                  <DataRow label={t("upgrade.chooseCycle")} value={ts("cycle", quote.billing_cycle)} />
                  <DataRow
                    label={t("upgrade.daysRemaining")}
                    value={localizeDigits(
                      `${quote.days_until_renewal} / ${quote.total_days}`,
                      locale,
                    )}
                  />
                  <DataRow
                    label={t("upgrade.priceDiff")}
                    value={<Money value={quote.price} emphasise />}
                  />

                  {upgradeMutation.isError ? (
                    <ErrorBanner error={upgradeMutation.error} className="mt-4" />
                  ) : null}

                  {gateways.isPending ? (
                    <LoadingBlock />
                  ) : (
                    <Button
                      className="mt-5"
                      fullWidth
                      size="lg"
                      icon="bi-credit-card"
                      loading={upgradeMutation.isPending}
                      disabled={quote.in_progress || !gateways.data?.length || !cycle}
                      onClick={() =>
                        upgradeMutation.mutate(
                          {
                            new_product_id: quote.new_product_id,
                            billing_cycle: cycle!,
                            payment_method: gateways.data![0].module,
                          },
                          {
                            onSuccess: (result) => {
                              if (result.payment_url) {
                                window.location.href = result.payment_url;
                              } else if (result.invoice_id) {
                                router.push(`/panel/invoices/${result.invoice_id}`);
                              } else {
                                router.push(`/panel/services/${id}`);
                              }
                            },
                          },
                        )
                      }
                    >
                      {t("upgrade.confirm")}
                    </Button>
                  )}
                </CardBody>
              </Card>
            </motion.div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const { t } = useI18n();
  const items: Array<{ key: Step | "pay"; label: string }> = [
    { key: "plan", label: t("upgrade.step.plan") },
    { key: "quote", label: t("upgrade.step.quote") },
    { key: "pay", label: t("upgrade.step.pay") },
  ];
  const activeIndex = current === "plan" ? 0 : 1;

  return (
    <ol className="flex items-center gap-2 text-xs" aria-label={t("upgrade.title")}>
      {items.map((item, index) => (
        <li key={item.key} className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold transition-colors",
              index <= activeIndex ? "bg-brand-500 text-white" : "bg-[var(--field-bg)] text-faint",
            )}
            aria-current={index === activeIndex ? "step" : undefined}
          >
            {index + 1}
          </span>
          <span className={index <= activeIndex ? "font-medium" : "text-faint"}>{item.label}</span>
          {index < items.length - 1 ? (
            <span className="h-px w-6 bg-[var(--field-border)]" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
