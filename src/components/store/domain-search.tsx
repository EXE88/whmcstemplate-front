"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/misc";
import { ErrorBanner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/lib/cart/store";
import { toLatinDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useDomainLookup, useTldPricing } from "@/lib/query/hooks";
import { cn } from "@/lib/utils/cn";

/** Same shape the bridge enforces, checked here so a typo never costs a round-trip. */
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9؀-ۿ](?:[a-z0-9؀-ۿ-]{0,61}[a-z0-9؀-ۿ])?\.)+[a-z؀-ۿ]{2,}$/i;

export function normaliseDomain(raw: string): string {
  return toLatinDigits(raw)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

/**
 * Domain search.
 *
 * The lookup is only fired on an explicit submit, not per keystroke: it is a
 * rate-limited, uncached-on-first-hit upstream call, and a user typing
 * "example.ir" would otherwise burn ten of them. Extension chips re-run the
 * same search against another TLD, which is the one place a second lookup is
 * worth it.
 */
export function DomainSearch({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const addDomain = useCart((state) => state.addDomain);

  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [invalid, setInvalid] = useState(false);

  const { data: tlds } = useTldPricing();
  const lookup = useDomainLookup(query, Boolean(query));

  const suggestions = useMemo(() => {
    if (!tlds || !query) return [];
    const sld = query.split(".")[0];
    return Object.keys(tlds)
      .map((tld) => (tld.startsWith(".") ? tld : `.${tld}`))
      .filter((tld) => `${sld}${tld}` !== query)
      .slice(0, 6)
      .map((tld) => ({ tld, domain: `${sld}${tld}`, price: tlds[tld.replace(/^\./, "")] ?? tlds[tld] }));
  }, [tlds, query]);

  const submit = (value: string) => {
    const candidate = normaliseDomain(value);
    setInput(candidate);
    if (!DOMAIN_RE.test(candidate)) {
      setInvalid(true);
      setQuery("");
      return;
    }
    setInvalid(false);
    setQuery(candidate);
  };

  return (
    <div className={cn("w-full", compact ? "" : "space-y-5")}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        className="glass ring-gradient flex flex-col gap-2 rounded-3xl p-2 sm:flex-row sm:items-center"
        role="search"
      >
        <label htmlFor="domain-query" className="sr-only">
          {t("domain.search.title")}
        </label>
        <div className="relative flex-1">
          <i
            className="bi bi-globe2 text-faint pointer-events-none absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4"
            aria-hidden
          />
          <input
            id="domain-query"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setInvalid(false);
            }}
            placeholder={t("domain.search.placeholder")}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            className="h-12 w-full rounded-2xl bg-transparent text-sm outline-none placeholder:text-[var(--faint-fg)] ltr:pl-11 ltr:pr-4 rtl:pr-11 rtl:pl-4"
          />
        </div>
        <Button
          type="submit"
          size="md"
          icon="bi-search"
          loading={lookup.isFetching}
          className="sm:w-40"
        >
          {lookup.isFetching ? t("domain.search.checking") : t("domain.search.action")}
        </Button>
      </form>

      {invalid ? (
        <p className="text-danger-500 flex items-center gap-1.5 px-2 text-xs" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden />
          {t("domain.search.invalid")}
        </p>
      ) : null}

      <AnimatePresence mode="wait">
        {lookup.isError ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ErrorBanner error={lookup.error} />
          </motion.div>
        ) : lookup.data ? (
          <motion.div
            key={lookup.data.domain}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <Card
              className={cn(
                "flex flex-wrap items-center justify-between gap-4 p-5",
                lookup.data.available ? "border-success-500/30" : "border-warning-500/30",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                    lookup.data.available
                      ? "bg-success-500/12 text-success-500"
                      : "bg-warning-500/12 text-warning-500",
                  )}
                >
                  <i
                    className={cn("bi text-lg", lookup.data.available ? "bi-check-lg" : "bi-x-lg")}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold" dir="ltr">
                    {lookup.data.domain}
                  </p>
                  <p className="text-muted text-xs">
                    {lookup.data.available ? t("domain.search.available") : t("domain.search.taken")}
                  </p>
                </div>
              </div>

              {lookup.data.available ? (
                <Button
                  icon="bi-bag-plus"
                  onClick={() => {
                    addDomain({ domain: lookup.data.domain });
                    toast.success(t("cart.added"), lookup.data.domain);
                  }}
                >
                  {t("domain.search.addToCart")}
                </Button>
              ) : lookup.data.whois ? (
                <WhoisDisclosure whois={lookup.data.whois} label={t("domain.search.whois")} />
              ) : null}
            </Card>

            {suggestions.length ? (
              <div className="space-y-2">
                <p className="text-faint px-1 text-xs">{t("domain.search.suggestions")}</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((item) => (
                    <button
                      key={item.domain}
                      type="button"
                      onClick={() => submit(item.domain)}
                      className="glass hover:border-brand-400/50 flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors"
                    >
                      <span className="font-mono" dir="ltr">
                        {item.tld}
                      </span>
                      {item.price?.register ? (
                        <Money value={item.price.register} className="text-[11px]" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Fresh installs have no TLD pricing at all; say so instead of showing a broken table. */}
      {!compact && tlds && Object.keys(tlds).length === 0 ? (
        <Card className="flex items-start gap-3 p-4">
          <i className="bi bi-info-circle text-brand-500 mt-0.5" aria-hidden />
          <p className="text-muted text-sm leading-7">{t("domain.pricing.empty")}</p>
        </Card>
      ) : null}

      {!compact && tlds && Object.keys(tlds).length > 0 ? <TldPriceTable pricing={tlds} /> : null}
    </div>
  );
}

function WhoisDisclosure({ whois, label }: { whois: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="text-muted flex items-center gap-1.5 text-xs hover:text-[var(--page-fg)]"
      >
        <i className={cn("bi", open ? "bi-chevron-up" : "bi-chevron-down")} aria-hidden />
        {label}
      </button>
      {open ? (
        <pre
          dir="ltr"
          className="text-faint mt-2 max-h-64 overflow-auto rounded-2xl bg-[var(--field-bg)] p-3 text-[11px] leading-5 whitespace-pre-wrap"
        >
          {whois}
        </pre>
      ) : null}
    </div>
  );
}

function TldPriceTable({
  pricing,
}: {
  pricing: Record<string, { register: string | null; transfer: string | null; renew: string | null }>;
}) {
  const { t } = useI18n();
  const rows = Object.entries(pricing).slice(0, 12);

  return (
    <Card className="overflow-hidden">
      <h3 className="border-b border-[var(--field-border)] px-5 py-4 text-sm font-semibold">
        {t("domain.pricing.title")}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-faint text-xs">
              <th className="px-5 py-3 font-medium ltr:text-left rtl:text-right">TLD</th>
              <th className="px-5 py-3 font-medium ltr:text-left rtl:text-right">
                {t("domain.pricing.register")}
              </th>
              <th className="px-5 py-3 font-medium ltr:text-left rtl:text-right">
                {t("domain.pricing.transfer")}
              </th>
              <th className="px-5 py-3 font-medium ltr:text-left rtl:text-right">
                {t("domain.pricing.renew")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([tld, price]) => (
              <tr key={tld} className="border-t border-[var(--field-border)]">
                <td className="px-5 py-3 font-mono text-xs" dir="ltr">
                  {tld.startsWith(".") ? tld : `.${tld}`}
                </td>
                <td className="px-5 py-3">
                  {price.register ? <Money value={price.register} /> : <span className="text-faint">—</span>}
                </td>
                <td className="px-5 py-3">
                  {price.transfer ? <Money value={price.transfer} /> : <span className="text-faint">—</span>}
                </td>
                <td className="px-5 py-3">
                  {price.renew ? <Money value={price.renew} /> : <span className="text-faint">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
