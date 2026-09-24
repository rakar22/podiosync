import CompaniesPage from "../empresas/page";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Buscar", "Search"), t(locale, "Busca empresas tecnológicas publicadas en TECHPODIO.", "Search technology companies published on TECHPODIO."), "/buscar");
}

export default CompaniesPage;
