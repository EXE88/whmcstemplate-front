"use client";

import { DomainSearch } from "@/components/store/domain-search";
import { PageHeader } from "@/components/ui/misc";
import { useI18n } from "@/lib/i18n/provider";

export default function DomainsPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        icon="bi-globe2"
        title={t("domain.search.title")}
        description={t("domain.search.subtitle")}
      />
      <DomainSearch />
    </div>
  );
}
