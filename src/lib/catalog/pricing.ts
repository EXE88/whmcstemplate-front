import { compareDecimal } from "@/lib/format/decimal";
import type { BillingCycle, Product, ProductPricing } from "@/lib/api/types";
import { SELLABLE_CYCLES } from "@/lib/api/types";

/**
 * Products carry one price map per configured currency. The install runs on
 * IRR, but the lookup falls back to whatever single currency exists rather than
 * rendering "—" if someone renames it.
 */
export function pricingFor(product: Product, currency = "IRR"): ProductPricing {
  const map = product.pricing ?? {};
  return map[currency] ?? map[Object.keys(map)[0] ?? ""] ?? {};
}

/**
 * A configured, non-zero price for this cycle, or `null`.
 *
 * Zero counts as "no price". WHMCS stores 0.00 for plans whose real cost comes
 * from configurable options — which this API does not expose — and rendering
 * that as "0 Toman" would advertise a paid server as free.
 */
export function priceOf(
  product: Product,
  cycle: BillingCycle,
  currency = "IRR",
): string | null {
  const value = pricingFor(product, currency)[cycle];
  if (!value || compareDecimal(value, "0") <= 0) return null;
  return value;
}

/** Distinguishes "priced on request" (explicit 0.00) from "not sold on this cycle". */
export function isPriceOnRequest(
  product: Product,
  cycle: BillingCycle,
  currency = "IRR",
): boolean {
  const value = pricingFor(product, currency)[cycle];
  return Boolean(value) && compareDecimal(value!, "0") <= 0;
}

export function setupFeeOf(product: Product, currency = "IRR"): string | null {
  const fee = pricingFor(product, currency).setup;
  if (!fee || compareDecimal(fee, "0") <= 0) return null;
  return fee;
}

/** Cycles this product actually has a price for, in canonical order. */
export function availableCycles(product: Product, currency = "IRR"): BillingCycle[] {
  const pricing = pricingFor(product, currency);
  return SELLABLE_CYCLES.filter((cycle) => Boolean(pricing[cycle]));
}

/** Union of cycles across the catalogue — drives the billing-period tabs. */
export function catalogueCycles(products: Product[], currency = "IRR"): BillingCycle[] {
  const present = new Set<BillingCycle>();
  for (const product of products) {
    for (const cycle of availableCycles(product, currency)) present.add(cycle);
  }
  return SELLABLE_CYCLES.filter((cycle) => present.has(cycle));
}

/**
 * Feature bullets for a plan card.
 *
 * WHMCS keeps the marketing copy in one free-text `description` field, and
 * hosts conventionally write it one feature per line. Splitting on newlines and
 * bullet characters gets a real list out of it without inventing data; if the
 * host wrote a paragraph, it stays a paragraph.
 */
export function describeProduct(product: Product): { bullets: string[]; paragraph: string } {
  const raw = (product.description ?? "").replace(/\r/g, "").trim();
  if (!raw) return { bullets: [], paragraph: "" };

  const lines = raw
    .split(/\n+|(?:^|\s)[•·‣▪]\s*/g)
    .map((line) => line.replace(/^[-*–—]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length >= 2) return { bullets: lines.slice(0, 8), paragraph: "" };
  return { bullets: [], paragraph: raw };
}

/** Cheapest configured price, used to sort plans the way customers scan them. */
export function sortProductsByPrice(products: Product[], cycle: BillingCycle): Product[] {
  return [...products].sort((a, b) => {
    const left = priceOf(a, cycle);
    const right = priceOf(b, cycle);
    if (!left && !right) return a.name.localeCompare(b.name);
    if (!left) return 1;
    if (!right) return -1;
    return compareDecimal(left, right);
  });
}
