"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, PasswordInput, Select } from "@/components/ui/field";
import { ErrorBanner, LoadingBlock } from "@/components/ui/states";
import { ApiError } from "@/lib/api/errors";
import { toLatinDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/session/provider";
import { cn } from "@/lib/utils/cn";

/** Matches the bridge's own phone regex so the field fails locally, not upstream. */
const PHONE_RE = /^\+?[0-9 \-()]{6,20}$/;

const COUNTRIES = ["IR", "AE", "TR", "DE", "GB", "US", "CA", "FR", "NL"] as const;

const schema = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  phone: z.string().trim().regex(PHONE_RE).or(z.literal("")),
  company: z.string().max(100).optional(),
  address1: z.string().max(150).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().length(2),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { signUp } = useSession();

  const [failure, setFailure] = useState<unknown>(null);
  const [showBilling, setShowBilling] = useState(false);
  const next = params.get("next") || "/panel";

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone: "",
      company: "",
      address1: "",
      city: "",
      state: "",
      postcode: "",
      country: "IR",
    },
  });

  const password = watch("password");

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    // Empty optional fields are dropped rather than sent blank: WHMCS stores
    // "" as a real value and it shows up on invoices.
    const payload = Object.fromEntries(
      Object.entries({ ...values, phone: toLatinDigits(values.phone) }).filter(
        ([, value]) => typeof value === "string" && value.trim() !== "",
      ),
    ) as Record<string, string>;

    try {
      await signUp(payload);
      router.replace(next.startsWith("/") ? next : "/panel");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "validation_error") {
        for (const [field, message] of Object.entries(error.fieldErrors())) {
          if (field in values) setError(field as keyof FormValues, { message });
        }
      }
      setFailure(error);
    }
  });

  return (
    <Card className="w-full max-w-xl p-7 sm:p-8">
      <div className="mb-6 text-center">
        <span className="from-brand-500/15 to-accent-500/15 text-brand-600 dark:text-brand-300 mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br">
          <i className="bi bi-person-plus text-2xl" aria-hidden />
        </span>
        <h1 className="text-xl font-bold">{t("auth.register.title")}</h1>
        <p className="text-muted mt-1 text-sm">{t("auth.register.subtitle")}</p>
      </div>

      {failure ? <ErrorBanner error={failure} className="mb-4" /> : null}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("auth.firstName")}
            required
            icon="bi-person"
            error={errors.first_name?.message}
            {...register("first_name")}
          />
          <Input
            label={t("auth.lastName")}
            required
            icon="bi-person"
            error={errors.last_name?.message}
            {...register("last_name")}
          />
        </div>

        <Input
          label={t("auth.email")}
          type="email"
          dir="ltr"
          autoComplete="email"
          icon="bi-envelope"
          required
          error={errors.email?.message}
          {...register("email")}
        />

        <div>
          <PasswordInput
            label={t("auth.newPassword")}
            autoComplete="new-password"
            icon="bi-key"
            required
            toggleLabels={[t("auth.showPassword"), t("auth.hidePassword")]}
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordStrength value={password} />
        </div>

        <Input
          label={t("auth.phone")}
          dir="ltr"
          inputMode="tel"
          icon="bi-telephone"
          hint={t("common.optional")}
          error={errors.phone?.message}
          {...register("phone")}
        />

        <button
          type="button"
          onClick={() => setShowBilling((value) => !value)}
          aria-expanded={showBilling}
          className="text-muted flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm hover:text-[var(--page-fg)]"
        >
          <span className="flex items-center gap-2">
            <i className="bi bi-geo-alt" aria-hidden />
            {t("auth.address")} <span className="text-faint text-xs">({t("common.optional")})</span>
          </span>
          <i className={cn("bi text-xs", showBilling ? "bi-chevron-up" : "bi-chevron-down")} aria-hidden />
        </button>

        {showBilling ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t("auth.company")} icon="bi-building" {...register("company")} />
            <Input label={t("auth.address")} icon="bi-geo-alt" {...register("address1")} />
            <Input label={t("auth.city")} {...register("city")} />
            <Input label={t("auth.state")} {...register("state")} />
            <Input label={t("auth.postcode")} dir="ltr" {...register("postcode")} />
            <Select label={t("auth.country")} {...register("country")}>
              {COUNTRIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <Button type="submit" fullWidth size="lg" loading={isSubmitting} icon="bi-person-plus">
          {t("auth.submitRegister")}
        </Button>
      </form>

      <p className="text-muted mt-6 text-center text-sm">
        {t("auth.hasAccount")}{" "}
        <Link
          href={`/login${next !== "/panel" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-brand-600 dark:text-brand-300 font-medium hover:underline"
        >
          {t("auth.submitLogin")}
        </Link>
      </p>
    </Card>
  );
}

/** Advisory only — the bridge runs Django's validators server-side. */
function PasswordStrength({ value }: { value: string }) {
  const { t } = useI18n();
  if (!value) return null;

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score += 1;

  const labels = [
    t("auth.strength.weak"),
    t("auth.strength.weak"),
    t("auth.strength.fair"),
    t("auth.strength.good"),
    t("auth.strength.strong"),
  ];
  const colours = ["bg-danger-500", "bg-danger-500", "bg-warning-500", "bg-accent-500", "bg-success-500"];

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex h-1.5 flex-1 gap-1" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "flex-1 rounded-full transition-colors duration-300",
              index < score ? colours[score] : "bg-[var(--field-border)]",
            )}
          />
        ))}
      </div>
      <span className="text-faint text-xs">
        {t("auth.passwordStrength")}: {labels[score]}
      </span>
    </div>
  );
}
