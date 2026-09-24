import { LegalDocument, legalTitle } from "@/components/legal-document";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, legalTitle(locale, "terms"), "TECHPODIO", "/terminos");
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return <LegalDocument locale={locale} doc="terms" />;
}
