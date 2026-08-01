import Link from "next/link";

/**
 * Rendered outside the providers tree, so it uses plain copy rather than the
 * i18n hook. Persian is the default locale and the safest fallback here.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-brand-500/10 text-brand-500 grid h-20 w-20 place-items-center rounded-3xl">
        <i className="bi bi-compass text-3xl" aria-hidden />
      </span>
      <h1 className="text-2xl font-bold">۴۰۴</h1>
      <p className="text-muted text-sm">این صفحه وجود ندارد. / This page does not exist.</p>
      <Link
        href="/"
        className="from-brand-600 to-brand-500 mt-2 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-l px-5 text-sm font-medium text-white"
      >
        <i className="bi bi-house" aria-hidden />
        بازگشت به خانه
      </Link>
    </div>
  );
}
