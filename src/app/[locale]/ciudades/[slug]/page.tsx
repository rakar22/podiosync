import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CompanyCard } from "@/components/company-card";
import { EmptyState } from "@/components/empty-state";
import { companyInclude, listCategories } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { countryName, t, ui } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, ...rest } = await params;
  const locale = await readLocale(Promise.resolve(rest));
  const city = await prisma.city.findUnique({ where: { slug }, include: { country: true } });
  if (!city) return {};
  return meta(locale, city.name, t(locale, `Empresas tecnológicas en ${city.name}.`, `Technology companies in ${city.name}.`), `/ciudades/${slug}`);
}

export default async function CityPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, ...rest } = await params;
  const locale = await readLocale(Promise.resolve(rest));
  const city = await prisma.city.findUnique({ where: { slug }, include: { country: true } });
  if (!city) notFound();
  const [companies, categories] = await Promise.all([
    prisma.company.findMany({ where: { cityId: city.id, isDemo: false }, include: companyInclude, take: 24, orderBy: { name: "asc" } }),
    listCategories(),
  ]);
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ href: `/${locale}`, label: "TECHPODIO" }, { href: `/${locale}/ciudades`, label: t(locale, "Ciudades", "Cities") }, { href: `/${locale}/paises/${city.country.slug}`, label: countryName(locale, city.country) }, { label: city.name }]} />
      <section className="hero">
        <h1>{city.name}</h1>
        <p className="lede">{t(locale, `${city.name} es un ámbito distinto del ranking nacional de ${countryName(locale, city.country)}. Una empresa puede patrocinar la ciudad, el país, o los dos: son huecos diferentes.`, `${city.name} is a different scope from the national ranking of ${countryName(locale, city.country)}. A company can sponsor the city, the country, or both: they are different slots.`)}</p>
      </section>
      <div className="badges">{categories.slice(0, 10).map((category) => <Link key={category.id} className="badge" href={`/${locale}/empresas/${category.slug}/${city.slug}`}>{locale === "en" ? category.nameEn : category.nameEs}</Link>)}</div>
      <section className="section">
        {companies.length ? <div className="grid-cards">{companies.map((company) => <CompanyCard key={company.id} locale={locale} company={company} />)}</div> : <EmptyState title={city.name} body={ui(locale).emptyCatalog} />}
      </section>
    </div>
  );
}
