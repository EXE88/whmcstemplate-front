"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DataRow } from "@/components/ui/card";
import { Checkbox, PasswordInput, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Money, PageHeader } from "@/components/ui/misc";
import { ErrorBanner, ErrorState, SkeletonCard } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { formatBytes, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useService, useServiceCancellation, useServicePasswordChange } from "@/lib/query/hooks";

/**
 * Service detail.
 *
 * Read-only facts on the left, the three things a customer can actually *do* on
 * the right — change the control-panel password, upgrade, or ask to cancel.
 * Both destructive-ish actions open a dialog rather than sitting inline: a
 * cancellation request is not something to trigger with a stray click.
 */
export default function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { t, ts, locale } = useI18n();
  const toast = useToast();

  const service = useService(id);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (service.isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <SkeletonCard rows={8} />
        <SkeletonCard rows={4} />
      </div>
    );
  }

  if (service.isError) {
    return (
      <Card>
        <ErrorState error={service.error} onRetry={() => service.refetch()} />
      </Card>
    );
  }

  const data = service.data;

  return (
    <div className="space-y-5">
      <PageHeader
        icon="bi-hdd-rack"
        title={data.name}
        description={data.domain || undefined}
        action={
          <>
            <ButtonLink href="/panel/services" variant="ghost" size="sm" icon="bi-arrow-right">
              {t("common.back")}
            </ButtonLink>
            <ButtonLink href={`/panel/services/${id}/upgrade`} size="sm" icon="bi-arrow-up-circle">
              {t("services.upgrade")}
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            icon="bi-info-circle"
            title={t("services.overview")}
            action={<StatusBadge status={data.status} />}
          />
          <CardBody className="pt-2">
            <DataRow icon="bi-globe2" label={t("services.domain")} value={data.domain || "—"} />
            <DataRow
              icon="bi-arrow-repeat"
              label={t("services.recurring")}
              value={
                <span className="flex items-center gap-2">
                  <Money value={data.amount} />
                  <span className="text-faint text-xs">{ts("cycle", data.billing_cycle)}</span>
                </span>
              }
            />
            <DataRow
              icon="bi-calendar-event"
              label={t("services.nextDue")}
              value={formatDate(data.next_due_date, locale)}
            />
            <DataRow
              icon="bi-calendar-check"
              label={t("services.registeredAt")}
              value={formatDate(data.registered_at, locale)}
            />
            <DataRow icon="bi-person-badge" label={t("services.username")} value={data.username || "—"} />
            <DataRow icon="bi-server" label={t("services.server")} value={data.server_hostname || "—"} />
            <DataRow
              icon="bi-ethernet"
              label={t("services.dedicatedIp")}
              value={data.dedicated_ip || "—"}
            />
            <DataRow
              icon="bi-hdd"
              label={t("services.disk")}
              value={data.disk_limit ? formatBytes(data.disk_limit, locale) : "—"}
            />
            <DataRow
              icon="bi-speedometer"
              label={t("services.bandwidth")}
              value={data.bandwidth_limit ? formatBytes(data.bandwidth_limit, locale) : "—"}
            />
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader icon="bi-sliders" title={t("common.actions")} />
          <CardBody className="flex flex-col gap-2 pt-4">
            <Button variant="secondary" icon="bi-key" onClick={() => setPasswordOpen(true)} fullWidth>
              {t("services.changePassword")}
            </Button>
            <ButtonLink
              href={`/panel/services/${id}/upgrade`}
              variant="secondary"
              icon="bi-arrow-up-circle"
              fullWidth
            >
              {t("services.upgrade")}
            </ButtonLink>
            <Button variant="ghost" icon="bi-x-circle" onClick={() => setCancelOpen(true)} fullWidth className="text-danger-500">
              {t("services.cancel")}
            </Button>
          </CardBody>
        </Card>
      </div>

      <PasswordDialog
        serviceId={id}
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onDone={() => {
          setPasswordOpen(false);
          toast.success(t("services.passwordChanged"));
        }}
      />

      <CancelDialog
        serviceId={id}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onDone={() => {
          setCancelOpen(false);
          toast.success(t("services.cancelRequested"));
        }}
      />
    </div>
  );
}

function PasswordDialog({
  serviceId,
  open,
  onClose,
  onDone,
}: {
  serviceId: number;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const mutation = useServicePasswordChange(serviceId);

  const tooShort = value.length > 0 && value.length < 10;

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="bi-key"
      title={t("services.changePassword")}
      description={t("services.changePasswordHint")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={value.length < 10}
            onClick={() =>
              mutation.mutate(value, {
                onSuccess: () => {
                  setValue("");
                  onDone();
                },
              })
            }
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {mutation.isError ? <ErrorBanner error={mutation.error} /> : null}
        <PasswordInput
          label={t("auth.newPassword")}
          autoComplete="new-password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={tooShort ? t("services.changePasswordHint") : undefined}
          toggleLabels={[t("auth.showPassword"), t("auth.hidePassword")]}
        />
      </div>
    </Modal>
  );
}

function CancelDialog({
  serviceId,
  open,
  onClose,
  onDone,
}: {
  serviceId: number;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [immediate, setImmediate] = useState(false);
  const mutation = useServiceCancellation(serviceId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="bi-x-circle"
      title={t("services.cancelTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            loading={mutation.isPending}
            disabled={reason.trim().length < 3}
            onClick={() =>
              mutation.mutate(
                { reason: reason.trim(), immediate },
                {
                  onSuccess: () => {
                    setReason("");
                    setImmediate(false);
                    onDone();
                  },
                },
              )
            }
          >
            {t("common.confirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {mutation.isError ? <ErrorBanner error={mutation.error} /> : null}
        <Textarea
          label={t("services.cancelReason")}
          required
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Checkbox
          label={t("services.cancelImmediate")}
          checked={immediate}
          onChange={(event) => setImmediate(event.target.checked)}
        />
        {immediate ? (
          <p className="text-danger-500 flex items-start gap-2 text-xs leading-6" role="alert">
            <i className="bi bi-exclamation-triangle-fill mt-0.5 shrink-0" aria-hidden />
            {t("services.cancelImmediateWarn")}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
