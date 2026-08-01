"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Money, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorBanner, LoadingBlock } from "@/components/ui/states";
import { normaliseDomain } from "@/components/store/domain-search";
import { ordersApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import type { OrderCreateResult } from "@/lib/api/types";
import { useCart } from "@/lib/cart/store";
import { priceOf } from "@/lib/catalog/pricing";
import { localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { usePaymentMethods, useProducts } from "@/lib/query/hooks";
import { useSession } from "@/lib/session/provider";
import { safeExternalUrl } from "@/lib/utils/safe-redirect";

/**
 * Checkout.
 *
 * Three rules shape this page. Payment is always a redirect to the URL the
 * bridge returns — there is no card field anywhere in this codebase. The
 * `Idempotency-Key` comes from the basket and is *not* regenerated on retry, so
 * a double click replays the first order. And if the bridge reports
 * `order_outcome_unknown`, the button stays disabled for good: the customer is
 * sent to look at their orders rather than risk buying twice.
 */
export default function CheckoutPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { isAuthenticated } = useSession();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lines = useCart((state) => state.lines);
  const promoCode = useCart((state) => state.promoCode);
  const setPromoCode = useCart((state) => state.setPromoCode);
  const nameservers = useCart((state) => state.nameservers);
  const setNameservers = useCart((state) => state.setNameservers);
  const idempotencyKey = useCart((state) => state.idempotencyKey);
  const blocked = useCart((state) => state.blocked);
  const block = useCart((state) => state.block);
  const clear = useCart((state) => state.clear);
  const toOrderItems = useCart((state) => state.toOrderItems);

  const products = useProducts();
  const gateways = usePaymentMethods();

  const [method, setMethod] = useState<string>("");
  const [redirecting, setRedirecting] = useState(false);

  /**
   * The inputs own their own value.
   *
   * Seeding them from the store on every change would fight the person typing:
   * as soon as two hosts became valid, the store update would echo back and
   * re-expand the field list under the cursor. The store is written on blur
   * instead, which is also when a half-typed hostname stops being noise.
   */
  const [nsInput, setNsInput] = useState<string[]>(() =>
    nameservers.length >= 2 ? [...nameservers] : ["", ""],
  );

  useEffect(() => {
    if (!method && gateways.data?.length) setMethod(gateways.data[0].module);
  }, [gateways.data, method]);

  const hasDomainLine = useMemo(() => lines.some((line) => line.kind === "domain"), [lines]);

  const placeOrder = useMutation({
    mutationFn: () => {
      const filled = nsInput.map(normaliseDomain).filter(Boolean);
      return ordersApi.create(
        {
          items: toOrderItems(),
          payment_method: method,
          ...(promoCode ? { promo_code: promoCode } : {}),
          ...(filled.length >= 2 ? { nameservers: filled.slice(0, 5) } : {}),
        },
        idempotencyKey,
      );
    },
    onSuccess: (result: OrderCreateResult) => {
      clear();
      const gateway = safeExternalUrl(result.payment_url);
      if (gateway) {
        setRedirecting(true);
        window.location.href = gateway;
        return;
      }
      router.push(`/panel/orders/${result.order_id}`);
    },
    onError: (error) => {
      // The order may have been created upstream — never let them press again.
      if (error instanceof ApiError && error.code === "order_outcome_unknown") block();
    },
  });

  if (!mounted) return <LoadingBlock />;

  if (!lines.length && !placeOrder.isPending && !redirecting) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Card>
          <EmptyState
            icon="bi-bag"
            title={t("cart.empty")}
            action={
              <ButtonLink href="/plans" icon="bi-hdd-rack">
                {t("cart.emptyCta")}
              </ButtonLink>
            }
          />
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Card>
          <EmptyState
            icon="bi-person-lock"
            title={t("checkout.loginRequired")}
            action={
              <div className="flex gap-2">
                <ButtonLink href="/login?next=%2Fcheckout" icon="bi-box-arrow-in-left">
                  {t("nav.login")}
                </ButtonLink>
                <ButtonLink href="/register?next=%2Fcheckout" variant="secondary">
                  {t("nav.register")}
                </ButtonLink>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <LoadingBlock label={t("checkout.redirecting")} />
      </div>
    );
  }

  const singleGateway = gateways.data?.length === 1 ? gateways.data[0] : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader icon="bi-credit-card" title={t("checkout.title")} />

      <Card>
        <CardHeader title={t("checkout.summary")} icon="bi-list-check" />
        <CardBody className="pt-4">
          <ul className="space-y-3">
            {lines.map((line) => {
              const product =
                line.kind === "product"
                  ? products.data?.find((item) => item.id === line.productId)
                  : undefined;
              const price =
                line.kind === "product" && product ? priceOf(product, line.billingCycle) : null;

              return (
                <li
                  key={line.lineId}
                  className="flex items-center justify-between gap-4 border-b border-[var(--field-border)] pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <i
                      className={`bi ${line.kind === "product" ? "bi-hdd-rack" : "bi-globe2"} text-faint`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {line.kind === "product" ? (
                          product?.name ?? line.name
                        ) : (
                          <span dir="ltr" className="font-mono">
                            {line.domain}
                          </span>
                        )}
                      </p>
                      <p className="text-faint text-xs">
                        {line.kind === "product"
                          ? line.domain || t("cart.item.product")
                          : `${localizeDigits(String(line.years), locale)} ${t("domain.year")}`}
                      </p>
                    </div>
                  </div>
                  {price ? (
                    <Money value={price} />
                  ) : (
                    <span className="text-faint text-xs">{t("checkout.priceOnInvoice")}</span>
                  )}
                </li>
              );
            })}
          </ul>

          <p className="text-faint mt-4 flex items-start gap-2 text-xs leading-6">
            <i className="bi bi-info-circle mt-0.5 shrink-0" aria-hidden />
            {t("cart.priceNotice")}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("checkout.paymentMethod")} icon="bi-bank" />
        <CardBody className="space-y-4 pt-4">
          {gateways.isPending ? (
            <LoadingBlock />
          ) : singleGateway ? (
            <p className="text-muted flex items-center gap-2 text-sm">
              <i className="bi bi-check-circle-fill text-success-500" aria-hidden />
              {t("checkout.singleGateway", { name: singleGateway.name || singleGateway.module })}
            </p>
          ) : gateways.data?.length ? (
            <Segmented
              ariaLabel={t("checkout.paymentMethod")}
              value={method}
              onChange={setMethod}
              options={gateways.data.map((gateway) => ({
                value: gateway.module,
                label: gateway.name || gateway.module,
              }))}
            />
          ) : (
            <ErrorBanner error={gateways.error} />
          )}

          <Input
            label={t("checkout.promoCode")}
            hint={t("common.optional")}
            placeholder={t("checkout.promoPlaceholder")}
            icon="bi-ticket-perforated"
            value={promoCode}
            onChange={(event) => setPromoCode(event.target.value.trim())}
          />

          {hasDomainLine ? (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">{t("checkout.nameservers")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {nsInput.map((value, index) => (
                  <Input
                    key={index}
                    aria-label={t("domains.nameserverRow", {
                      index: localizeDigits(String(index + 1), locale),
                    })}
                    dir="ltr"
                    placeholder={`ns${index + 1}.example.ir`}
                    value={value}
                    onChange={(event) => {
                      const next = [...nsInput];
                      next[index] = event.target.value;
                      setNsInput(next);
                    }}
                    onBlur={() => setNameservers(nsInput.map(normaliseDomain).filter(Boolean))}
                  />
                ))}
              </div>
              <p className="text-faint text-xs leading-5">{t("checkout.nameserversHint")}</p>
            </fieldset>
          ) : null}
        </CardBody>
      </Card>

      {placeOrder.isError ? <ErrorBanner error={placeOrder.error} /> : null}

      {blocked ? (
        <Card className="border-warning-500/30 flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-muted flex items-start gap-2 text-sm leading-6">
            <i className="bi bi-shield-exclamation text-warning-500 mt-0.5" aria-hidden />
            {t("error.orderBlocked")}
          </p>
          <ButtonLink href="/panel/orders" variant="secondary" size="sm" icon="bi-receipt">
            {t("error.viewOrders")}
          </ButtonLink>
        </Card>
      ) : null}

      <Card className="space-y-4 p-5">
        <p className="text-muted flex items-start gap-2 text-xs leading-6">
          <i className="bi bi-shield-lock mt-0.5 shrink-0" aria-hidden />
          {t("checkout.notice")}
        </p>
        <Button
          fullWidth
          size="lg"
          icon="bi-credit-card"
          loading={placeOrder.isPending}
          disabled={blocked || !method || !lines.length}
          onClick={() => placeOrder.mutate()}
        >
          {placeOrder.isPending ? t("checkout.placing") : t("checkout.place")}
        </Button>
      </Card>
    </div>
  );
}
