import { CategoryCard } from "@/components/category-card";
import { listCategories } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Categorías", "Categories"), t(locale, "Taxonomía de empresas tecnológicas en TECHPODIO.", "Taxonomy of technology companies on TECHPODIO."), "/categorias");
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const categories = await listCategories();
  return (
    <div className="wrap">
      <section className="hero">
        <h1>{t(locale, "Categorías", "Categories")}</h1>
        <p className="lede">{t(locale, "Cada categoría puede tener rankings por país y ciudad. Las descripciones explican el ámbito; no estiman el tamaño del mercado.", "Each category can have rankings by country and city. Descriptions explain the scope; they do not estimate market size.")}</p>
      </section>
      <div className="grid-cards">{categories.map((category) => <CategoryCard key={category.id} locale={locale} category={category} />)}</div>
    </div>
  );
}
