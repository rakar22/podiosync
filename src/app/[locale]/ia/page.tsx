import Link from "next/link";
import { CategoryCard } from "@/components/category-card";
import { listCategories } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Inteligencia artificial", "Artificial intelligence"), t(locale, "Categorías de IA en el directorio TECHPODIO.", "AI categories in the TECHPODIO directory."), "/ia");
}

export default async function AiPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const categories = (await listCategories()).filter((category) => category.group === "ai");
  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">IA</p>
        <h1>{t(locale, "Empresas de inteligencia artificial", "Artificial intelligence companies")}</h1>
        <p className="lede">{t(locale, "Hub de categorías de IA. Cada una tiene fichas, rankings y posiciones patrocinadas propias. No publicamos cifras de mercado que no tengamos.", "Hub of AI categories. Each one has its own profiles, rankings, and sponsored positions. We do not publish market figures we do not have.")}</p>
        <Link className="btn" href={`/${locale}/rankings/artificial-intelligence`}>{t(locale, "Abrir rankings de IA", "Open AI rankings")}</Link>
      </section>
      <div className="grid-cards">{categories.map((category) => <CategoryCard key={category.id} locale={locale} category={category} href={category.slug === "artificial-intelligence" ? `/${locale}/categorias/${category.slug}` : `/${locale}/ia/${category.slug}`} />)}</div>
    </div>
  );
}
