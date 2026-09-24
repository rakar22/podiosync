import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { CookieConsent } from "@/components/cookie-consent";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { readLocale } from "@/lib/locale";
import { siteName } from "@/lib/site";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const headerStore = await headers();
  const path = headerStore.get("x-pathname") || `/${locale}`;
  return (
    <>
      <SiteHeader locale={locale} />
      <main id="contenido">{children}</main>
      <SiteFooter locale={locale} />
      <CookieConsent locale={locale} siteName={siteName()} />
      <AnalyticsBeacon locale={locale} path={path} />
    </>
  );
}
