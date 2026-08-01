"use client";

import Link from "next/link";
import { useState } from "react";
import { ListShell } from "@/components/panel/list-shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { daysFromNow, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useDomains } from "@/lib/query/hooks";

export default function DomainsPage() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const query = useDomains(page);

  return (
    <div className="space-y-5">
      <PageHeader
        icon="bi-globe2"
        title={t("domains.title")}
        action={
          <ButtonLink href="/domains" size="sm" icon="bi-plus-lg">
            {t("domains.emptyCta")}
          </ButtonLink>
        }
      />

      <ListShell
        query={query}
        onPageChange={setPage}
        empty={{
          icon: "bi-globe2",
          title: t("domains.empty"),
          action: (
            <ButtonLink href="/domains" icon="bi-plus-lg">
              {t("domains.emptyCta")}
            </ButtonLink>
          ),
        }}
      >
        {(domains) => (
          <ul className="space-y-3">
            {domains.map((domain) => {
              const days = daysFromNow(domain.expires_at);
              const soon = days !== null && days >= 0 && days <= 30;

              return (
                <li key={domain.id}>
                  <Link href={`/panel/domains/${domain.id}`} className="block">
                    <Card className="hover:border-brand-400/50 flex flex-wrap items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5">
                      <span className="bg-accent-500/12 text-accent-600 dark:text-accent-300 grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
                        <i className="bi bi-globe2 text-lg" aria-hidden />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono font-semibold" dir="ltr">
                          {domain.domain}
                        </p>
                        <p className="text-faint truncate text-xs">{domain.registrar || "—"}</p>
                      </div>

                      <div className="text-end">
                        <p className="text-faint text-xs">{t("domains.expires")}</p>
                        <p className="text-sm font-medium">{formatDate(domain.expires_at, locale)}</p>
                      </div>

                      {soon ? (
                        <Badge tone="warning" icon="bi-hourglass-split">
                          {t("domains.expiringSoon")}
                        </Badge>
                      ) : null}
                      <StatusBadge status={domain.status} />
                      <i className="bi bi-chevron-left text-faint ltr:rotate-180" aria-hidden />
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </ListShell>
    </div>
  );
}
