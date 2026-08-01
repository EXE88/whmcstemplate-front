"use client";

/** Route-level crash boundary. Keeps the shell alive and offers a real retry. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-danger-500/10 text-danger-500 grid h-20 w-20 place-items-center rounded-3xl">
        <i className="bi bi-exclamation-triangle text-3xl" aria-hidden />
      </span>
      <h1 className="text-xl font-bold">مشکلی پیش آمد</h1>
      <p className="text-muted max-w-md text-sm leading-7">
        خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.
      </p>
      {error.digest ? (
        <p className="text-faint font-mono text-xs">{error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="from-brand-600 to-brand-500 mt-2 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-l px-5 text-sm font-medium text-white"
      >
        <i className="bi bi-arrow-clockwise" aria-hidden />
        تلاش دوباره
      </button>
    </div>
  );
}
