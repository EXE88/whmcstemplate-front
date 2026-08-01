"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, PasswordInput } from "@/components/ui/field";
import { ErrorBanner, LoadingBlock } from "@/components/ui/states";
import { ApiError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/session/provider";
import { safeNextPath } from "@/lib/utils/safe-redirect";

const schema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

/**
 * Sign-in.
 *
 * The install this talks to authenticates with email + password today, while
 * the legacy WHMCS panel uses mobile + OTP. The form is therefore written as a
 * *step machine* with one step: adding `"otp"` to `Step` and a second panel is
 * an addition, not a rewrite, and the session response already carries
 * `two_factor_enabled` to trigger it.
 */
type Step = "credentials";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useSession();

  const [step] = useState<Step>("credentials");
  const [failure, setFailure] = useState<unknown>(null);

  const next = safeNextPath(params.get("next"));
  const expired = params.get("expired") === "1";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await signIn(values.email.trim().toLowerCase(), values.password);
      router.replace(next);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "validation_error") {
        for (const [field, message] of Object.entries(error.fieldErrors())) {
          if (field === "email" || field === "password") {
            setError(field, { message });
          }
        }
      }
      setFailure(error);
    }
  });

  return (
    <Card className="w-full max-w-md p-7 sm:p-8">
      <div className="mb-6 text-center">
        <span className="from-brand-500/15 to-accent-500/15 text-brand-600 dark:text-brand-300 mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br">
          <i className="bi bi-box-arrow-in-left text-2xl" aria-hidden />
        </span>
        <h1 className="text-xl font-bold">{t("auth.login.title")}</h1>
        <p className="text-muted mt-1 text-sm">{t("auth.login.subtitle")}</p>
      </div>

      {expired ? (
        <div className="bg-warning-500/10 border-warning-500/25 text-warning-600 dark:text-warning-300 mb-4 flex items-center gap-2 rounded-2xl border p-3 text-sm">
          <i className="bi bi-clock-history shrink-0" aria-hidden />
          {t("auth.sessionExpired")}
        </div>
      ) : null}

      {failure ? <ErrorBanner error={failure} className="mb-4" /> : null}

      {step === "credentials" ? (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label={t("auth.email")}
            type="email"
            dir="ltr"
            autoComplete="email"
            icon="bi-envelope"
            required
            error={errors.email ? t("error.validation_error") : undefined}
            {...register("email")}
          />
          <PasswordInput
            label={t("auth.password")}
            autoComplete="current-password"
            icon="bi-key"
            required
            toggleLabels={[t("auth.showPassword"), t("auth.hidePassword")]}
            error={errors.password ? t("error.validation_error") : undefined}
            {...register("password")}
          />
          <Button type="submit" fullWidth size="lg" loading={isSubmitting} icon="bi-box-arrow-in-left">
            {t("auth.submitLogin")}
          </Button>
        </form>
      ) : null}

      <p className="text-muted mt-6 text-center text-sm">
        {t("auth.noAccount")}{" "}
        <Link
          href={`/register${next !== "/panel" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-brand-600 dark:text-brand-300 font-medium hover:underline"
        >
          {t("auth.submitRegister")}
        </Link>
      </p>
    </Card>
  );
}
