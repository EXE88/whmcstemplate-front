"use client";

import Link from "next/link";
import { localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { BRAND_NAME, Logo } from "./brand";

export function StoreFooter() {
  const { t, locale } = useI18n();
  const year = localizeDigits(String(new Date().getFullYear()), locale);

  return (
    <footer className="mt-20 border-t border-[var(--field-border)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted max-w-sm text-sm leading-7">{t("store.hero.subtitle")}</p>
        </div>

        <nav className="space-y-2 text-sm" aria-label={t("nav.menu")}>
          <h3 className="mb-3 font-semibold">{t("nav.plans")}</h3>
          <FooterLink href="/plans">{t("store.plans.title")}</FooterLink>
          <FooterLink href="/domains">{t("domain.search.title")}</FooterLink>
          <FooterLink href="/cart">{t("cart.title")}</FooterLink>
        </nav>

        <nav className="space-y-2 text-sm" aria-label={t("footer.support")}>
          <h3 className="mb-3 font-semibold">{t("footer.support")}</h3>
          <FooterLink href="/panel/tickets">{t("panel.tickets")}</FooterLink>
          <FooterLink href="/panel/invoices">{t("panel.invoices")}</FooterLink>
          <FooterLink href="/login">{t("nav.login")}</FooterLink>
        </nav>
      </div>

      <div className="border-t border-[var(--field-border)]">
        <p className="text-faint mx-auto max-w-7xl px-4 py-5 text-center text-xs sm:px-6">
          © {year} {BRAND_NAME} — {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted block transition-colors hover:text-[var(--page-fg)]"
    >
      {children}
    </Link>
  );
}
