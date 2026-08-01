"use client";

import { PlanGrid } from "@/components/store/plan-grid";
import { PageHeader } from "@/components/ui/misc";
import { useI18n } from "@/lib/i18n/provider";

export default function PlansPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        icon="bi-hdd-rack"
        title={t("store.plans.title")}
        description={t("store.plans.subtitle")}
      />
      <PlanGrid />
    </div>
  );
}
