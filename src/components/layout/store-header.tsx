"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink, IconButton } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { localizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/session/provider";
import { cn } from "@/lib/utils/cn";
import { BRAND_NAME, LocaleToggle, Logo, ThemeToggle } from "./brand";

const LINKS = [
  { href: "/", key: "nav.home", icon: "bi-house" },
  { href: "/plans", key: "nav.plans", icon: "bi-hdd-rack" },
  { href: "/domains", key: "nav.domains", icon: "bi-globe2" },
] as const;

export function StoreHeader() {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const { isAuthenticated } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The cart lives in localStorage; reading it during SSR would mismatch.
  const [mounted, setMounted] = useState(false);
  const cartCount = useCart((state) => state.lines.length);

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled ? "glass-strong border-b" : "border-b border-transparent",
      )}
    >
      <a
        href="#main"
        className="bg-brand-500 sr-only rounded-b-xl px-4 py-2 text-sm text-white focus:not-sr-only focus:absolute focus:top-0 focus:z-50 ltr:left-4 rtl:right-4"
      >
        {t("nav.skipToContent")}
      </a>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <nav className="mx-auto hidden items-center gap-1 md:flex" aria-label={BRAND_NAME}>
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "text-brand-600 dark:text-brand-300" : "text-muted hover:text-[var(--page-fg)]",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="store-nav"
                    className="bg-brand-500/12 absolute inset-0 rounded-xl"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative">{t(link.key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-1 md:ms-0">
          <LocaleToggle className="hidden sm:flex" />
          <ThemeToggle />

          <Link
            href="/cart"
            aria-label={t("nav.cart")}
            className="text-muted relative grid h-10 w-10 place-items-center rounded-xl transition-colors hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)]"
          >
            <i className="bi bi-bag text-base" aria-hidden />
            {mounted && cartCount > 0 ? (
              <span className="bg-brand-500 tnum absolute top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white ltr:right-1 rtl:left-1">
                {localizeDigits(String(cartCount), locale)}
              </span>
            ) : null}
          </Link>

          {isAuthenticated ? (
            <ButtonLink href="/panel" size="sm" icon="bi-speedometer2" className="hidden sm:inline-flex">
              {t("nav.panel")}
            </ButtonLink>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <ButtonLink href="/login" size="sm" variant="ghost">
                {t("nav.login")}
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                {t("nav.register")}
              </ButtonLink>
            </div>
          )}

          <IconButton
            icon={open ? "bi-x-lg" : "bi-list"}
            label={t("nav.menu")}
            onClick={() => setOpen((value) => !value)}
            className="md:hidden"
            aria-expanded={open}
          />
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong overflow-hidden md:hidden"
            aria-label={t("nav.menu")}
          >
            <div className="flex flex-col gap-1 p-4">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)]"
                >
                  <i className={cn("bi", link.icon)} aria-hidden />
                  {t(link.key)}
                </Link>
              ))}
              <div className="mt-2 flex gap-2 border-t border-[var(--field-border)] pt-3">
                {isAuthenticated ? (
                  <ButtonLink href="/panel" size="sm" fullWidth icon="bi-speedometer2">
                    {t("nav.panel")}
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href="/login" size="sm" variant="secondary" fullWidth>
                      {t("nav.login")}
                    </ButtonLink>
                    <ButtonLink href="/register" size="sm" fullWidth>
                      {t("nav.register")}
                    </ButtonLink>
                  </>
                )}
              </div>
              <LocaleToggle className="sm:hidden" />
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
