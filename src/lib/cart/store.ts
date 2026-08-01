"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BillingCycle, OrderItem } from "@/lib/api/types";

/**
 * The basket.
 *
 * It records *what* is being bought and nothing else — no price, no discount,
 * no total. Prices shown next to a line are read live from the catalogue at
 * render time, so a stale basket can never misquote a customer, and WHMCS stays
 * the only authority on what anything costs.
 *
 * `idempotencyKey` is minted once per basket state: every mutation replaces it,
 * and it survives reloads alongside the items. A double-clicked pay button
 * therefore replays the first order instead of buying twice, while a genuinely
 * different basket gets a fresh key.
 */

export interface CartProductLine {
  lineId: string;
  kind: "product";
  productId: number;
  /** Cached for display only; never sent to the API. */
  name: string;
  billingCycle: BillingCycle;
  quantity: number;
  domain: string;
}

export interface CartDomainLine {
  lineId: string;
  kind: "domain";
  domain: string;
  action: "register" | "transfer";
  years: number;
  idProtection: boolean;
  dnsManagement: boolean;
  eppCode: string;
}

export type CartLine = CartProductLine | CartDomainLine;

interface CartState {
  lines: CartLine[];
  idempotencyKey: string;
  promoCode: string;
  nameservers: string[];
  /** Set when an order's outcome is unknown; the pay button stays locked. */
  blocked: boolean;

  addProduct: (input: {
    productId: number;
    name: string;
    billingCycle: BillingCycle;
    domain?: string;
  }) => void;
  addDomain: (input: {
    domain: string;
    action?: "register" | "transfer";
    years?: number;
  }) => void;
  updateProduct: (lineId: string, changes: Partial<Omit<CartProductLine, "lineId" | "kind">>) => void;
  updateDomain: (lineId: string, changes: Partial<Omit<CartDomainLine, "lineId" | "kind">>) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  setPromoCode: (code: string) => void;
  setNameservers: (hosts: string[]) => void;
  block: () => void;
  toOrderItems: () => OrderItem[];
}

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function lineId(): string {
  return newKey().slice(0, 8);
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      idempotencyKey: newKey(),
      promoCode: "",
      nameservers: [],
      blocked: false,

      addProduct: (input) =>
        set((state) => ({
          lines: [
            ...state.lines,
            {
              lineId: lineId(),
              kind: "product",
              productId: input.productId,
              name: input.name,
              billingCycle: input.billingCycle,
              quantity: 1,
              domain: input.domain ?? "",
            },
          ],
          idempotencyKey: newKey(),
          blocked: false,
        })),

      addDomain: (input) =>
        set((state) => {
          const domain = input.domain.trim().toLowerCase();
          if (state.lines.some((line) => line.kind === "domain" && line.domain === domain)) {
            return state;
          }
          return {
            lines: [
              ...state.lines,
              {
                lineId: lineId(),
                kind: "domain",
                domain,
                action: input.action ?? "register",
                years: input.years ?? 1,
                idProtection: false,
                dnsManagement: true,
                eppCode: "",
              },
            ],
            idempotencyKey: newKey(),
            blocked: false,
          };
        }),

      updateProduct: (id, changes) =>
        set((state) => ({
          lines: state.lines.map((line) =>
            line.lineId === id && line.kind === "product" ? { ...line, ...changes } : line,
          ),
          idempotencyKey: newKey(),
          blocked: false,
        })),

      updateDomain: (id, changes) =>
        set((state) => ({
          lines: state.lines.map((line) =>
            line.lineId === id && line.kind === "domain" ? { ...line, ...changes } : line,
          ),
          idempotencyKey: newKey(),
          blocked: false,
        })),

      remove: (id) =>
        set((state) => ({
          lines: state.lines.filter((line) => line.lineId !== id),
          idempotencyKey: newKey(),
          blocked: false,
        })),

      clear: () =>
        set({
          lines: [],
          promoCode: "",
          nameservers: [],
          idempotencyKey: newKey(),
          blocked: false,
        }),

      // Promo code and nameservers change the order body, so they rotate the
      // key too: otherwise a retry would replay the order without them.
      setPromoCode: (code) => set({ promoCode: code, idempotencyKey: newKey(), blocked: false }),
      setNameservers: (hosts) =>
        set({ nameservers: hosts, idempotencyKey: newKey(), blocked: false }),

      block: () => set({ blocked: true }),

      toOrderItems: () =>
        get().lines.map((line): OrderItem => {
          if (line.kind === "product") {
            return {
              type: "product",
              product_id: line.productId,
              billing_cycle: line.billingCycle,
              quantity: line.quantity,
              ...(line.domain ? { domain: line.domain } : {}),
            };
          }
          return {
            type: "domain",
            domain: line.domain,
            action: line.action,
            years: line.years,
            id_protection: line.idProtection,
            dns_management: line.dnsManagement,
            ...(line.action === "transfer" && line.eppCode ? { epp_code: line.eppCode } : {}),
          };
        }),
    }),
    {
      name: "lh-cart",
      version: 1,
      partialize: (state) => ({
        lines: state.lines,
        idempotencyKey: state.idempotencyKey,
        promoCode: state.promoCode,
        nameservers: state.nameservers,
        blocked: state.blocked,
      }),
    },
  ),
);

/** Item count, safe to call during SSR (returns 0 before hydration). */
export function useCartCount(): number {
  return useCart((state) => state.lines.length);
}
