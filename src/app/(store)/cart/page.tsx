"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Money, PageHeader } from "@/components/ui/misc";
import { EmptyState, SkeletonList } from "@/components/ui/states";
import { normaliseDomain } from "@/components/store/domain-search";
import type { BillingCycle, Product } from "@/lib/api/types";
import { useCart, type CartDomainLine, type CartProductLine } from "@/lib/cart/store";
import { availableCycles, priceOf } from "@/lib/catalog/pricing";
import { localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useProducts, useTldPricing } from "@/lib/query/hooks";

/**
 * The basket.
 *
 * Every editable decision that changes what WHMCS will bill — billing period,
 * registration years, whois privacy — is editable here rather than at checkout,
 * so the checkout page can be a single confirm-and-go step. Prices are looked
 * up live from the catalogue for display only; the basket itself stores none.
 */
export default function CartPage() {
  const { t, locale } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lines = useCart((state) => state.lines);
  const clear = useCart((state) => state.clear);
  const products = useProducts();

  const countLabel =
    lines.length === 1
      ? t("cart.countOne")
      : t("cart.count", { count: localizeDigits(String(lines.length), locale) });

  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <SkeletonList count={2} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader
        icon="bi-bag"
        title={t("cart.title")}
        description={lines.length ? countLabel : undefined}
        action={
          lines.length ? (
            <Button variant="ghost" size="sm" icon="bi-trash3" onClick={clear}>
              {t("cart.clear")}
            </Button>
          ) : null
        }
      />

      {!lines.length ? (
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
      ) : (
        <>
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {lines.map((line) => (
                <motion.li
                  key={line.lineId}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {line.kind === "product" ? (
                    <ProductLineCard line={line} catalogue={products.data ?? []} />
                  ) : (
                    <DomainLineCard line={line} />
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="text-muted flex items-start gap-2 text-xs leading-6">
              <i className="bi bi-info-circle mt-0.5 shrink-0" aria-hidden />
              {t("cart.priceNotice")}
            </p>
            <div className="flex gap-2 ms-auto">
              <ButtonLink href="/plans" variant="ghost" size="sm">
                {t("cart.continueShopping")}
              </ButtonLink>
              <ButtonLink href="/checkout" icon="bi-credit-card">
                {t("cart.checkout")}
              </ButtonLink>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function LineShell({
  icon,
  title,
  subtitle,
  price,
  onRemove,
  children,
}: {
  icon: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  price?: React.ReactNode;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <span className="bg-brand-500/12 text-brand-600 dark:text-brand-300 grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
          <i className={`bi ${icon} text-lg`} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          {subtitle ? <p className="text-faint mt-0.5 text-xs">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {price}
          <IconButton icon="bi-trash3" label={t("cart.removeItem")} size="sm" onClick={onRemove} />
        </div>
      </div>
      {children ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div> : null}
    </Card>
  );
}

function ProductLineCard({
  line,
  catalogue,
}: {
  line: CartProductLine;
  catalogue: Product[];
}) {
  const { t, ts } = useI18n();
  const update = useCart((state) => state.updateProduct);
  const remove = useCart((state) => state.remove);

  const product = catalogue.find((item) => item.id === line.productId);
  const offered = product ? availableCycles(product) : [];
  // A basket saved before the catalogue changed can hold a cycle the plan no
  // longer sells. Keep it in the list so the select shows what is actually
  // selected instead of rendering blank.
  const cycles = offered.includes(line.billingCycle) ? offered : [line.billingCycle, ...offered];
  const price = product ? priceOf(product, line.billingCycle) : null;

  return (
    <LineShell
      icon="bi-hdd-rack"
      title={product?.name ?? line.name}
      subtitle={t("cart.item.product")}
      price={price ? <Money value={price} /> : <span className="text-faint text-xs">{t("checkout.priceOnInvoice")}</span>}
      onRemove={() => remove(line.lineId)}
    >
      <Select
        label={t("upgrade.chooseCycle")}
        value={line.billingCycle}
        onChange={(event) =>
          update(line.lineId, { billingCycle: event.target.value as BillingCycle })
        }
      >
        {cycles.map((cycle) => (
          <option key={cycle} value={cycle}>
            {ts("cycle", cycle)}
          </option>
        ))}
      </Select>

      <Input
        label={t("cart.domainFor")}
        hint={t("cart.domainForHint")}
        placeholder={t("cart.domainForPlaceholder")}
        dir="ltr"
        value={line.domain}
        onChange={(event) => update(line.lineId, { domain: event.target.value })}
        onBlur={(event) =>
          update(line.lineId, {
            domain: event.target.value ? normaliseDomain(event.target.value) : "",
          })
        }
      />
    </LineShell>
  );
}

function DomainLineCard({ line }: { line: CartDomainLine }) {
  const { t, locale } = useI18n();
  const update = useCart((state) => state.updateDomain);
  const remove = useCart((state) => state.remove);
  const { data: tlds } = useTldPricing();

  const tld = line.domain.slice(line.domain.indexOf("."));
  const price = tlds?.[tld.replace(/^\./, "")] ?? tlds?.[tld];

  return (
    <LineShell
      icon="bi-globe2"
      title={<span dir="ltr" className="font-mono">{line.domain}</span>}
      subtitle={t("cart.item.domain")}
      price={
        price?.register ? (
          <Money value={price.register} />
        ) : (
          <span className="text-faint text-xs">{t("checkout.priceOnInvoice")}</span>
        )
      }
      onRemove={() => remove(line.lineId)}
    >
      <Select
        label={t("domain.years")}
        value={String(line.years)}
        onChange={(event) => update(line.lineId, { years: Number(event.target.value) })}
      >
        {[1, 2, 3, 4, 5].map((year) => (
          <option key={year} value={year}>
            {localizeDigits(String(year), locale)} {t("domain.year")}
          </option>
        ))}
      </Select>

      <div className="flex flex-col justify-center gap-2 pt-1">
        <Checkbox
          label={t("domain.idProtection")}
          checked={line.idProtection}
          onChange={(event) => update(line.lineId, { idProtection: event.target.checked })}
        />
        <Checkbox
          label={t("domain.dnsManagement")}
          checked={line.dnsManagement}
          onChange={(event) => update(line.lineId, { dnsManagement: event.target.checked })}
        />
      </div>

      {line.action === "transfer" ? (
        <Input
          label={t("domain.eppCode")}
          hint={t("domain.transfer.eppRequired")}
          dir="ltr"
          value={line.eppCode}
          onChange={(event) => update(line.lineId, { eppCode: event.target.value })}
          wrapperClassName="sm:col-span-2"
        />
      ) : null}
    </LineShell>
  );
}
