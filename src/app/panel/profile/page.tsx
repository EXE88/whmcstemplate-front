"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DataRow } from "@/components/ui/card";
import { Input, PasswordInput, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/misc";
import { ErrorBanner, ErrorState, SkeletonCard } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";
import type { ProfileUpdate } from "@/lib/api/types";
import { formatDate, localizeDigits, toLatinDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import {
  useChangeAccountPassword,
  useContacts,
  useProfile,
  useUpdateProfile,
} from "@/lib/query/hooks";

const PHONE_RE = /^\+?[0-9 \-()]{6,20}$/;
const COUNTRIES = ["IR", "AE", "TR", "DE", "GB", "US", "CA", "FR", "NL"] as const;

const profileSchema = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
  company: z.string().max(100),
  address1: z.string().trim().min(1).max(150),
  address2: z.string().max(150),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  postcode: z.string().trim().min(1).max(20),
  country: z.string().length(2),
  phone: z.string().trim().regex(PHONE_RE),
});

type ProfileValues = z.infer<typeof profileSchema>;

/**
 * Profile and security.
 *
 * Email is deliberately read-only: the bridge does not accept it as an editable
 * field (changing it would re-key the local account against WHMCS), so it is
 * shown with the reason rather than as a field that silently fails.
 */
export default function ProfilePage() {
  const { t, locale } = useI18n();
  const profile = useProfile();

  if (profile.isPending) {
    return (
      <div className="space-y-4">
        <SkeletonCard rows={6} />
        <SkeletonCard rows={3} />
      </div>
    );
  }

  if (profile.isError) {
    return (
      <Card>
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      </Card>
    );
  }

  const data = profile.data;

  return (
    <div className="space-y-5">
      <PageHeader icon="bi-person-gear" title={t("profile.title")} />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <PersonalCard />

        <div className="space-y-4">
          <Card>
            <CardHeader icon="bi-person-badge" title={t("profile.accountStatus")} />
            <CardBody className="pt-2">
              <DataRow label={t("auth.email")} value={<span dir="ltr">{data.email}</span>} />
              <DataRow
                label={t("profile.clientId")}
                value={localizeDigits(String(data.whmcs_client_id), locale)}
              />
              <DataRow
                label={t("common.status")}
                value={<Badge tone={data.status === "Active" ? "success" : "neutral"}>{data.status}</Badge>}
              />
              <DataRow label={t("profile.memberSince")} value={formatDate(data.created_at, locale)} />
              <p className="text-faint mt-3 flex items-start gap-2 text-xs leading-5">
                <i className="bi bi-info-circle mt-0.5 shrink-0" aria-hidden />
                {t("profile.emailReadonly")}
              </p>
            </CardBody>
          </Card>

          <SecurityCard />
          <ContactsCard />
        </div>
      </div>
    </div>
  );
}

function PersonalCard() {
  const { t } = useI18n();
  const toast = useToast();
  const profile = useProfile();
  const mutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      company: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      postcode: "",
      country: "IR",
      phone: "",
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    const data = profile.data;
    reset({
      first_name: data.first_name ?? "",
      last_name: data.last_name ?? "",
      company: data.company ?? "",
      address1: data.address1 ?? "",
      address2: data.address2 ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      postcode: data.postcode ?? "",
      country: (data.country || "IR").toUpperCase().slice(0, 2),
      phone: data.phone ?? "",
    });
  }, [profile.data, reset]);

  const onSubmit = handleSubmit((values) => {
    const payload: ProfileUpdate = { ...values, phone: toLatinDigits(values.phone) };
    mutation.mutate(payload, {
      onSuccess: () => toast.success(t("profile.saved")),
      onError: (error) => {
        if (error instanceof ApiError && error.code === "validation_error") {
          for (const [field, message] of Object.entries(error.fieldErrors())) {
            if (field in values) setError(field as keyof ProfileValues, { message });
          }
        }
      },
    });
  });

  return (
    <Card as="section">
      <CardHeader icon="bi-person" title={t("profile.personal")} description={t("profile.personalHint")} />
      <CardBody className="pt-4">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {mutation.isError ? <ErrorBanner error={mutation.error} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t("auth.firstName")} required error={errors.first_name?.message} {...register("first_name")} />
            <Input label={t("auth.lastName")} required error={errors.last_name?.message} {...register("last_name")} />
            <Input label={t("auth.company")} error={errors.company?.message} {...register("company")} />
            <Input
              label={t("auth.phone")}
              dir="ltr"
              inputMode="tel"
              required
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Input
              label={t("auth.address")}
              required
              wrapperClassName="sm:col-span-2"
              error={errors.address1?.message}
              {...register("address1")}
            />
            <Input label={t("auth.address2")} error={errors.address2?.message} {...register("address2")} />
            <Input label={t("auth.city")} required error={errors.city?.message} {...register("city")} />
            <Input label={t("auth.state")} required error={errors.state?.message} {...register("state")} />
            <Input
              label={t("auth.postcode")}
              dir="ltr"
              required
              error={errors.postcode?.message}
              {...register("postcode")}
            />
            <Select label={t("auth.country")} error={errors.country?.message} {...register("country")}>
              {COUNTRIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </div>

          <Button type="submit" icon="bi-check-lg" loading={mutation.isPending} disabled={!isDirty}>
            {mutation.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function SecurityCard() {
  const { t } = useI18n();
  const toast = useToast();
  const mutation = useChangeAccountPassword();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = current.length > 0 && next.length >= 8 && !mismatch;

  return (
    <Card as="section">
      <CardHeader icon="bi-shield-lock" title={t("profile.security")} />
      <CardBody className="pt-4">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready) return;
            mutation.mutate(
              { current_password: current, new_password: next },
              {
                onSuccess: () => {
                  setCurrent("");
                  setNext("");
                  setConfirm("");
                  toast.success(t("profile.passwordChanged"));
                },
              },
            );
          }}
        >
          {mutation.isError ? <ErrorBanner error={mutation.error} /> : null}

          <PasswordInput
            label={t("auth.currentPassword")}
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            toggleLabels={[t("auth.showPassword"), t("auth.hidePassword")]}
          />
          <PasswordInput
            label={t("auth.newPassword")}
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            toggleLabels={[t("auth.showPassword"), t("auth.hidePassword")]}
          />
          <PasswordInput
            label={t("auth.confirmPassword")}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            error={mismatch ? t("error.validation_error") : undefined}
            toggleLabels={[t("auth.showPassword"), t("auth.hidePassword")]}
          />

          <Button type="submit" icon="bi-key" loading={mutation.isPending} disabled={!ready} fullWidth>
            {t("common.save")}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function ContactsCard() {
  const { t } = useI18n();
  const contacts = useContacts();

  return (
    <Card as="section">
      <CardHeader icon="bi-people" title={t("profile.contacts")} />
      <CardBody className="pt-2">
        {contacts.isPending ? (
          <p className="text-faint py-3 text-sm">{t("common.loading")}</p>
        ) : contacts.isError ? (
          <ErrorState error={contacts.error} onRetry={() => contacts.refetch()} className="py-4" />
        ) : contacts.data.length ? (
          <ul>
            {contacts.data.map((contact) => (
              <li
                key={contact.id}
                className="border-b border-[var(--field-border)] py-2.5 text-sm last:border-0"
              >
                <p className="font-medium">
                  {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"}
                </p>
                <p className="text-faint text-xs" dir="ltr">
                  {contact.email || "—"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-faint py-3 text-sm">{t("profile.contactsEmpty")}</p>
        )}
      </CardBody>
    </Card>
  );
}
