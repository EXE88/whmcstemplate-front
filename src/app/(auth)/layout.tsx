import { LocaleToggle, Logo, ThemeToggle } from "@/components/layout/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
