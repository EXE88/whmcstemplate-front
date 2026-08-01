"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import type { BillingCycle, Product } from "@/lib/api/types";
import { useCart } from "@/lib/cart/store";
import {
  catalogueCycles,
  describeProduct,
  isPriceOnRequest,
  priceOf,
  setupFeeOf,
  sortProductsByPrice,
} from "@/lib/catalog/pricing";
import { useI18n } from "@/lib/i18n/provider";
import { useProducts } from "@/lib/query/hooks";
import { cn } from "@/lib/utils/cn";

/**
 * The plan wall.
 *
 * One decision drives the layout: the billing period is a property of the whole
 * comparison, not of each card, so it lives in a single control above the grid
 * and every price re-renders together. Cards only offer periods that actually
 * have a configured price — a plan sold monthly-only never shows an empty
 * annual slot.
 */
export function PlanGrid({ limit }: { limit?: number }) {
  const { t, ts } = useI18n();
  const toast = useToast();
  const addProduct = useCart((state) => state.addProduct);
  const { data, isPending, isError, error, refetch } = useProducts();

  const cycles = useMemo(() => (data ? catalogueCycles(data) : []), [data]);
  const [cycle, setCycle] = useState<BillingCycle | null>(null);
  const activeCycle: BillingCycle = cycle ?? cycles[0] ?? "monthly";

  const products = useMemo(() => {
    if (!data) return [];
    const sorted = sortProductsByPrice(data, activeCycle);
    return limit ? sorted.slice(0, limit) : sorted;
  }, [data, activeCycle, limit]);

  if (isPending) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} rows={6} />
        ))}
      </div>
    );
  }

  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  if (!products.length) {
    return <EmptyState icon="bi-box-seam" title={t("store.plans.empty")} />;
  }

  // A middle card gets the highlight only when there is a genuine middle.
  const highlightIndex = products.length >= 3 ? 1 : -1;

  return (
    <div className="space-y-8">
      {cycles.length > 1 ? (
        <div className="flex justify-center">
          <Segmented
            ariaLabel={t("upgrade.chooseCycle")}
            value={activeCycle}
            onChange={setCycle}
            options={cycles.map((value) => ({ value, label: ts("cycle", value) }))}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-5",
          products.length === 1 ? "mx-auto max-w-md" : "sm:grid-cols-2",
          products.length >= 3 && "lg:grid-cols-3",
        )}
      >
        {products.map((product, index) => (
          <PlanCard
            key={product.id}
            product={product}
            cycle={activeCycle}
            featured={index === highlightIndex}
            index={index}
            onSelect={() => {
              addProduct({
                productId: product.id,
                name: product.name,
                billingCycle: activeCycle,
              });
              toast.success(t("cart.added"), product.name);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  product,
  cycle,
  featured,
  index,
  onSelect,
}: {
  product: Product;
  cycle: BillingCycle;
  featured: boolean;
  index: number;
  onSelect: () => void;
}) {
  const { t, ts } = useI18n();
  const price = priceOf(product, cycle);
  const onRequest = !price && isPriceOnRequest(product, cycle);
  const setup = setupFeeOf(product);
  const { bullets, paragraph } = describeProduct(product);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "glass ring-gradient relative flex flex-col rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1",
        featured && "lg:-my-2 lg:scale-[1.03]",
      )}
    >
      {featured ? (
        <span className="from-brand-600 to-accent-500 absolute -top-3 rounded-full bg-gradient-to-l px-3 py-1 text-[11px] font-semibold text-white shadow-lg ltr:left-6 rtl:right-6">
          {t("store.plans.popular")}
        </span>
      ) : null}

      <h3 className="text-lg font-bold">{product.name}</h3>

      <div className="mt-4 min-h-16">
        {price ? (
          <>
            <Money value={price} emphasise className="text-brand-600 dark:text-brand-300" />
            <p className="text-faint mt-1 text-xs">{ts("cycle", cycle)}</p>
          </>
        ) : (
          <p className="text-faint text-sm leading-6">
            {onRequest ? t("store.plans.priceOnRequest") : t("store.plans.noPriceForCycle")}
          </p>
        )}
        {setup ? (
          <p className="text-faint mt-1 text-xs">
            {t("store.plans.setupFee")}: <Money value={setup} className="text-xs" />
          </p>
        ) : null}
      </div>

      <div className="my-5 h-px bg-[var(--field-border)]" />

      {bullets.length ? (
        <ul className="flex-1 space-y-2.5 text-sm">
          {bullets.map((bullet, bulletIndex) => (
            <li key={bulletIndex} className="flex items-start gap-2.5 leading-6">
              <i className="bi bi-check-circle-fill text-success-500 mt-1 shrink-0 text-xs" aria-hidden />
              <span className="text-muted">{bullet}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted flex-1 text-sm leading-7">{paragraph}</p>
      )}

      <Button
        className="mt-6"
        fullWidth
        variant={featured ? "primary" : "secondary"}
        icon="bi-bag-plus"
        disabled={!price}
        onClick={onSelect}
      >
        {t("store.plans.choose")}
      </Button>
    </motion.article>
  );
}
