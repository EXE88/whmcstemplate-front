"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { normaliseDomain } from "@/components/store/domain-search";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DataRow } from "@/components/ui/card";
import { Input, Switch } from "@/components/ui/field";
import { CopyButton, Money, PageHeader } from "@/components/ui/misc";
import { ErrorBanner, ErrorState, SkeletonCard } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { formatDate, localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import {
  useDomain,
  useDomainLock,
  useEppCode,
  useNameservers,
  useSetDomainLock,
  useSetNameservers,
} from "@/lib/query/hooks";

/**
 * Domain detail.
 *
 * Three independent controls, each with its own endpoint and therefore its own
 * save state: nameservers (2–5, validated locally before the round-trip), the
 * transfer lock (an optimistic-feeling switch that still waits for the API), and
 * the EPP code — which some registrars return inline and others email to the
 * owner. Both outcomes are reported explicitly; an empty box would read as a
 * failure when it is actually a success.
 */
export default function DomainDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { t, locale } = useI18n();

  const domain = useDomain(id);

  if (domain.isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <SkeletonCard rows={6} />
        <SkeletonCard rows={4} />
      </div>
    );
  }

  if (domain.isError) {
    return (
      <Card>
        <ErrorState error={domain.error} onRetry={() => domain.refetch()} />
      </Card>
    );
  }

  const data = domain.data;

  return (
    <div className="space-y-5">
      <PageHeader
        icon="bi-globe2"
        title={<span dir="ltr" className="font-mono">{data.domain}</span>}
        action={
          <ButtonLink href="/panel/domains" variant="ghost" size="sm" icon="bi-arrow-right">
            {t("common.back")}
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              icon="bi-info-circle"
              title={t("common.details")}
              action={<StatusBadge status={data.status} />}
            />
            <CardBody className="pt-2">
              <DataRow icon="bi-building" label={t("domains.registrar")} value={data.registrar || "—"} />
              <DataRow
                icon="bi-calendar-check"
                label={t("services.registeredAt")}
                value={formatDate(data.registered_at, locale)}
              />
              <DataRow
                icon="bi-calendar-x"
                label={t("domains.expires")}
                value={formatDate(data.expires_at, locale)}
              />
              <DataRow
                icon="bi-arrow-repeat"
                label={t("services.recurring")}
                value={<Money value={data.amount} />}
              />
              <DataRow
                icon="bi-arrow-clockwise"
                label={t("domains.autoRenew")}
                value={
                  <Badge tone={data.auto_renew ? "success" : "neutral"}>
                    {data.auto_renew ? t("common.enabled") : t("common.disabled")}
                  </Badge>
                }
              />
              <DataRow
                icon="bi-incognito"
                label={t("domain.idProtection")}
                value={
                  <Badge tone={data.id_protection ? "success" : "neutral"}>
                    {data.id_protection ? t("common.enabled") : t("common.disabled")}
                  </Badge>
                }
              />
              <DataRow
                icon="bi-clock"
                label={t("domain.years")}
                value={`${localizeDigits(String(data.registration_period || 1), locale)} ${t("domain.year")}`}
              />
            </CardBody>
          </Card>

          <NameserverCard domainId={id} />
        </div>

        <div className="space-y-4">
          <LockCard domainId={id} />
          <EppCard domainId={id} />
        </div>
      </div>
    </div>
  );
}

function NameserverCard({ domainId }: { domainId: number }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const query = useNameservers(domainId);
  const mutation = useSetNameservers(domainId);

  const [hosts, setHosts] = useState<string[]>(["", ""]);

  useEffect(() => {
    if (query.data?.nameservers?.length) {
      setHosts([...query.data.nameservers]);
    }
  }, [query.data]);

  const cleaned = hosts.map((host) => normaliseDomain(host)).filter(Boolean);
  const valid = cleaned.length >= 2 && cleaned.length <= 5;

  return (
    <Card>
      <CardHeader icon="bi-hdd-network" title={t("domains.nameservers")} />
      <CardBody className="space-y-3 pt-4">
        {query.isPending ? (
          <SkeletonCard rows={2} className="border-0 bg-transparent p-0 shadow-none" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-6" />
        ) : (
          <>
            {mutation.isError ? <ErrorBanner error={mutation.error} /> : null}

            {hosts.map((host, index) => (
              <div key={index} className="flex items-end gap-2">
                <Input
                  wrapperClassName="flex-1"
                  label={t("domains.nameserverRow", { index: localizeDigits(String(index + 1), locale) })}
                  dir="ltr"
                  value={host}
                  placeholder={`ns${index + 1}.example.ir`}
                  onChange={(event) => {
                    const next = [...hosts];
                    next[index] = event.target.value;
                    setHosts(next);
                  }}
                />
                {hosts.length > 2 ? (
                  <IconButton
                    icon="bi-x-lg"
                    size="sm"
                    label={t("common.remove")}
                    className="mb-0.5"
                    onClick={() => setHosts(hosts.filter((_, i) => i !== index))}
                  />
                ) : null}
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {hosts.length < 5 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="bi-plus-lg"
                  onClick={() => setHosts([...hosts, ""])}
                >
                  {t("domains.addNameserver")}
                </Button>
              ) : null}
              <Button
                size="sm"
                className="ms-auto"
                icon="bi-check-lg"
                disabled={!valid}
                loading={mutation.isPending}
                onClick={() =>
                  mutation.mutate(cleaned, {
                    onSuccess: () => toast.success(t("domains.nameserversSaved")),
                  })
                }
              >
                {t("common.save")}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function LockCard({ domainId }: { domainId: number }) {
  const { t } = useI18n();
  const query = useDomainLock(domainId);
  const mutation = useSetDomainLock(domainId);
  const locked = query.data?.locked ?? false;

  return (
    <Card>
      <CardHeader icon="bi-lock" title={t("domains.lock")} />
      <CardBody className="space-y-3 pt-4">
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-4" />
        ) : (
          <>
            {mutation.isError ? <ErrorBanner error={mutation.error} /> : null}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {query.isPending ? "…" : locked ? t("domains.lockOn") : t("domains.lockOff")}
                </p>
                <p className="text-faint mt-0.5 text-xs leading-5">{t("domains.lockHint")}</p>
              </div>
              <Switch
                label={t("domains.lock")}
                checked={locked}
                disabled={query.isPending || mutation.isPending}
                onChange={(next) => mutation.mutate(next)}
              />
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function EppCard({ domainId }: { domainId: number }) {
  const { t } = useI18n();
  const mutation = useEppCode(domainId);

  return (
    <Card>
      <CardHeader icon="bi-shield-lock" title={t("domains.epp")} />
      <CardBody className="space-y-3 pt-4">
        {mutation.isError ? <ErrorBanner error={mutation.error} /> : null}

        {mutation.data ? (
          mutation.data.delivery === "inline" && mutation.data.epp_code ? (
            <div className="space-y-2">
              <p className="text-muted text-xs">{t("domains.eppInline")}</p>
              <div className="flex items-center gap-2 rounded-2xl bg-[var(--field-bg)] p-3">
                <code className="flex-1 truncate font-mono text-sm" dir="ltr">
                  {mutation.data.epp_code}
                </code>
                <CopyButton value={mutation.data.epp_code} />
              </div>
            </div>
          ) : (
            <p className="text-muted flex items-start gap-2 text-sm leading-6">
              <i className="bi bi-envelope-check text-success-500 mt-0.5 shrink-0" aria-hidden />
              {t("domains.eppEmailed")}
            </p>
          )
        ) : null}

        <Button
          variant="secondary"
          fullWidth
          icon="bi-key"
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {t("domains.eppRequest")}
        </Button>
      </CardBody>
    </Card>
  );
}
