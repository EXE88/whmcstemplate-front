"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { localizeDigits } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n/dictionaries/fa";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/session/provider";
import { cn } from "@/lib/utils/cn";
import { LocaleToggle, Logo, ThemeToggle } from "./brand";

interface NavItem {
  href: string;
  key: TranslationKey;
  icon: string;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: "/panel", key: "panel.dashboard", icon: "bi-grid-1x2", exact: true },
  { href: "/panel/services", key: "panel.services", icon: "bi-hdd-rack" },
  { href: "/panel/domains", key: "panel.domains", icon: "bi-globe2" },
  { href: "/panel/invoices", key: "panel.invoices", icon: "bi-receipt" },
  { href: "/panel/transactions", key: "panel.transactions", icon: "bi-arrow-left-right" },
  { href: "/panel/orders", key: "panel.orders", icon: "bi-bag-check" },
  { href: "/panel/tickets", key: "panel.tickets", icon: "bi-life-preserver" },
  { href: "/panel/profile", key: "panel.profile", icon: "bi-person-gear" },
];

/**
 * Panel chrome.
 *
 * A persistent rail on desktop and a slide-over on mobile, both fed by the same
 * `NAV` array so a new page appears in exactly one place. The rail is `<nav>`
 * with `aria-current` on the active entry; the mobile drawer traps nothing and
 * closes on navigation, which is what a drawer that is really a menu should do.
 */
export function PanelShell({ children }: { children: React.ReactNode }) {
  const { t, dir } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The drawer slides in from the side the sidebar lives on in this direction.
  const drawerOffset = dir === "rtl" ? "100%" : "-100%";

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex min-h-dvh">
      <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-0 border-e p-4 lg:flex">
        <div className="px-2 py-2">
          <Logo />
        </div>
        <PanelNav pathname={pathname} className="mt-6 flex-1" />
        <PanelFooterLinks />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-strong sticky top-0 z-40 flex h-16 items-center gap-2 border-0 border-b px-4 sm:px-6">
          <IconButton
            icon="bi-list"
            label={t("nav.menu")}
            onClick={() => setOpen(true)}
            className="lg:hidden"
            aria-expanded={open}
          />
          <div className="lg:hidden">
            <Logo compact />
          </div>

          <Link
            href="/"
            className="text-muted ms-auto hidden items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)] sm:flex"
          >
            <i className="bi bi-shop" aria-hidden />
            {t("panel.shop")}
          </Link>

          <CartLink className="sm:ms-0 ms-auto" />
          <LocaleToggle />
          <ThemeToggle />
          <UserMenu />
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[rgb(6_8_20/0.5)] backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              initial={{ x: drawerOffset, opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: drawerOffset, opacity: 0.6 }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="glass-strong absolute inset-y-0 flex w-72 flex-col p-4 ltr:left-0 rtl:right-0"
              aria-label={t("nav.menu")}
            >
              <div className="flex items-center justify-between px-2 py-1">
                <Logo />
                <IconButton icon="bi-x-lg" label={t("common.close")} size="sm" onClick={() => setOpen(false)} />
              </div>
              <PanelNav pathname={pathname} className="mt-5 flex-1 overflow-y-auto" />
              <PanelFooterLinks />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function PanelNav({ pathname, className }: { pathname: string; className?: string }) {
  const { t } = useI18n();
  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label={t("nav.panel")}>
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-brand-600 dark:text-brand-300"
                : "text-muted hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)]",
            )}
          >
            {active ? (
              <motion.span
                layoutId="panel-nav"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="bg-brand-500/12 absolute inset-0 rounded-xl"
              />
            ) : null}
            <i className={cn("bi relative text-base", item.icon)} aria-hidden />
            <span className="relative">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function PanelFooterLinks() {
  const { t } = useI18n();
  const { signOut } = useSession();
  return (
    <div className="mt-4 space-y-1 border-t border-[var(--field-border)] pt-3">
      <Link
        href="/"
        className="text-muted flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)]"
      >
        <i className="bi bi-shop" aria-hidden />
        {t("panel.shop")}
      </Link>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-danger-500 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-[var(--field-bg)]"
      >
        <i className="bi bi-box-arrow-right" aria-hidden />
        {t("nav.logout")}
      </button>
    </div>
  );
}

function CartLink({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const [mounted, setMounted] = useState(false);
  const count = useCart((state) => state.lines.length);
  useEffect(() => setMounted(true), []);

  return (
    <Link
      href="/cart"
      aria-label={t("nav.cart")}
      className={cn(
        "text-muted relative grid h-10 w-10 place-items-center rounded-xl transition-colors hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)]",
        className,
      )}
    >
      <i className="bi bi-bag text-base" aria-hidden />
      {mounted && count > 0 ? (
        <span className="bg-brand-500 tnum absolute top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white ltr:right-1 rtl:left-1">
          {localizeDigits(String(count), locale)}
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu() {
  const { t } = useI18n();
  const { user, signOut } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="from-brand-500 to-accent-500 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-xs font-bold text-white"
      >
        {initials}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="glass-strong absolute top-12 z-50 w-56 rounded-2xl p-2 ltr:right-0 rtl:left-0"
          >
            <p className="text-faint truncate px-3 py-2 text-xs" dir="ltr">
              {user?.email}
            </p>
            <Link
              href="/panel/profile"
              role="menuitem"
              className="text-muted flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-[var(--field-bg)] hover:text-[var(--page-fg)]"
            >
              <i className="bi bi-person-gear" aria-hidden />
              {t("panel.profile")}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut()}
              className="text-danger-500 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-[var(--field-bg)]"
            >
              <i className="bi bi-box-arrow-right" aria-hidden />
              {t("nav.logout")}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
