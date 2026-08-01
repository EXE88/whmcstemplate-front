import type { Metadata, Viewport } from "next";
import { AuroraBackground } from "@/components/ui/misc";
import { dirOf } from "@/lib/i18n/config";
import { getRequestContext } from "@/server/request-context";
import { Providers } from "./providers";
import "./globals.css";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? "LithiumHost";

export const metadata: Metadata = {
  title: { default: `${BRAND} — میزبانی ابری`, template: `%s | ${BRAND}` },
  description: "میزبانی وب پرسرعت، ثبت دامنه و پنل کاربری مدرن.",
  applicationName: BRAND,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fc" },
    { media: "(prefers-color-scheme: dark)", color: "#070a18" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, theme, user } = await getRequestContext();

  return (
    <html lang={locale} dir={dirOf(locale)} className={theme === "dark" ? "dark" : undefined}>
      <body className="min-h-dvh antialiased">
        <AuroraBackground />
        <Providers locale={locale} theme={theme} user={user}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
