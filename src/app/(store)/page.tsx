"use client";

import { motion } from "framer-motion";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DomainSearch } from "@/components/store/domain-search";
import { PlanGrid } from "@/components/store/plan-grid";
import { useI18n } from "@/lib/i18n/provider";

const FEATURES = [
  { icon: "bi-lightning-charge-fill", title: "store.features.speed.title", body: "store.features.speed.body" },
  { icon: "bi-shield-check", title: "store.features.uptime.title", body: "store.features.uptime.body" },
  { icon: "bi-clock-history", title: "store.features.backup.title", body: "store.features.backup.body" },
  { icon: "bi-headset", title: "store.features.support.title", body: "store.features.support.body" },
] as const;

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass text-muted inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs"
          >
            <span className="bg-success-500 h-1.5 w-1.5 rounded-full" aria-hidden />
            {t("store.hero.badge")}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="mt-5 text-3xl font-black leading-[1.35] tracking-tight sm:text-5xl sm:leading-[1.25]"
          >
            {t("store.hero.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="text-muted mx-auto mt-4 max-w-xl text-sm leading-8 sm:text-base"
          >
            {t("store.hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-3"
          >
            <ButtonLink href="/plans" size="lg" icon="bi-rocket-takeoff">
              {t("store.hero.cta")}
            </ButtonLink>
            <ButtonLink href="/domains" size="lg" variant="secondary" icon="bi-globe2">
              {t("store.hero.ctaDomain")}
            </ButtonLink>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24 }}
          className="mx-auto mt-12 max-w-3xl"
        >
          <DomainSearch compact />
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">
          {t("store.features.title")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
            >
              <Card className="h-full p-5">
                <span className="from-brand-500/15 to-accent-500/15 text-brand-600 dark:text-brand-300 mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br">
                  <i className={`bi ${feature.icon} text-lg`} aria-hidden />
                </span>
                <h3 className="text-sm font-semibold">{t(feature.title)}</h3>
                <p className="text-muted mt-1.5 text-xs leading-6">{t(feature.body)}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-labelledby="plans-heading">
        <div className="mb-8 text-center">
          <h2 id="plans-heading" className="text-2xl font-bold sm:text-3xl">
            {t("store.plans.title")}
          </h2>
          <p className="text-muted mt-2 text-sm leading-7">{t("store.plans.subtitle")}</p>
        </div>
        <PlanGrid limit={3} />
        <div className="mt-8 text-center">
          <ButtonLink href="/plans" variant="secondary" iconEnd="bi-arrow-left-short">
            {t("store.plans.compare")}
          </ButtonLink>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Card className="from-brand-500/10 to-accent-500/10 relative overflow-hidden bg-gradient-to-br p-8 text-center sm:p-12">
          <h2 className="text-xl font-bold sm:text-2xl">{t("store.cta.title")}</h2>
          <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-7">{t("store.cta.body")}</p>
          <ButtonLink href="/plans" size="lg" className="mt-6" icon="bi-rocket-takeoff">
            {t("store.hero.cta")}
          </ButtonLink>
        </Card>
      </section>
    </>
  );
}
