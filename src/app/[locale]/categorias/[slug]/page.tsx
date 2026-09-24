import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CompanyCard } from "@/components/company-card";
import { EmptyState } from "@/components/empty-state";
import { JsonLd } from "@/components/json-ld";
import { companyInclude, listCities } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { categoryName, t, ui } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, ...rest } = await params;
  const locale = await readLocale(Promise.resolve(rest));
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};
  return meta(locale, categoryName(locale, category), locale === "en" ? category.descriptionEn : category.descriptionEs, `/categorias/${slug}`);
}

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, ...rest } = await params;
  const locale = await readLocale(Promise.resolve(rest));
  const category = await prisma.category.findUnique({ where: { slug }, include: { children: true, parent: true } });
  if (!category) notFound();
  const [companies, cities] = await Promise.all([
    prisma.company.findMany({ where: { isDemo: false, categories: { some: { categoryId: category.id } } }, include: companyInclude, orderBy: { name: "asc" }, take: 24 }),
    listCities(),
  ]);
  const name = categoryName(locale, category);
  const hubs = cities.filter((city) => city.isHub).slice(0, 8);
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ href: `/${locale}`, label: "TECHPODIO" }, { href: `/${locale}/categorias`, label: t(locale, "Categorías", "Categories") }, { label: name }]} />
      <section className="hero">
        <h1>{name}</h1>
        <p className="lede">{locale === "en" ? category.descriptionEn : category.descriptionEs}</p>
      </section>
      {category.children.length ? (
        <p className="tiny">{t(locale, "Subcategorías", "Subcategories")}: {category.children.map((child) => <Link key={child.id} href={`/${locale}/categorias/${child.slug}`}> {categoryName(locale, child)}</Link>)}</p>
      ) : null}
      <section className="section">
        <h2>{t(locale, "Rankings por ciudad", "Rankings by city")}</h2>
        <div className="badges">
          {hubs.map((city) => <Link key={city.id} className="badge" href={`/${locale}/rankings/${category.slug}/${city.country.slug}/${city.slug}`}>{city.name}</Link>)}
          <Link className="badge" href={`/${locale}/rankings/${category.slug}`}>{t(locale, "Elegir país", "Choose a country")}</Link>
        </div>
      </section>
      <section className="section">
        <h2>{t(locale, "Empresas publicadas", "Published companies")}</h2>
        {companies.length ? <div className="grid-cards">{companies.map((company) => <CompanyCard key={company.id} locale={locale} company={company} />)}</div> : <EmptyState title={name} body={ui(locale).emptyCatalog} />}
      </section>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name, description: locale === "en" ? category.descriptionEn : category.descriptionEs }} />
    </div>
  );
}
