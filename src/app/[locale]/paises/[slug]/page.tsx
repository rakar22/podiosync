import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CityCard } from "@/components/city-card";
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
  const country = await prisma.country.findUnique({ where: { slug } });
  if (!country) return {};
  const name = countryName(locale, country);
  return meta(locale, name, t(locale, `Empresas tecnológicas publicadas en ${name}.`, `Technology companies published in ${name}.`), `/paises/${slug}`);
}

export default async function CountryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, ...rest } = await params;
  const locale = await readLocale(Promise.resolve(rest));
  const country = await prisma.country.findUnique({ where: { slug }, include: { cities: { orderBy: { name: "asc" } } } });
  if (!country) notFound();
  const [companies, categories] = await Promise.all([
    prisma.company.findMany({ where: { countryId: country.id, isDemo: false }, include: companyInclude, orderBy: { name: "asc" }, take: 24 }),
    listCategories(),
  ]);
  const name = countryName(locale, country);
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ href: `/${locale}`, label: "TECHPODIO" }, { href: `/${locale}/paises`, label: t(locale, "Países", "Countries") }, { label: name }]} />
      <section className="hero">
        <p className="kicker">{country.code}</p>
        <h1>{name}</h1>
        <p className="lede">{t(locale, `${name} tiene un tablero nacional por categoría y tableros de ciudad cuando la ciudad está en el directorio. Las posiciones patrocinadas de país y de ciudad son huecos distintos.`, `${name} has a national board per category and city boards when the city is in the directory. Country and city sponsored positions are different slots.`)}</p>
      </section>
      <section className="section">
        <h2>{t(locale, "Ciudades", "Cities")}</h2>
        {country.cities.length ? <div className="grid-cards">{country.cities.map((city) => <CityCard key={city.id} locale={locale} city={{ ...city, country }} />)}</div> : <p className="muted">{t(locale, "Todavía no hay ciudades semilla. El ranking nacional sigue disponible.", "There are no seed cities yet. The national ranking is still available.")}</p>}
      </section>
      <section className="section">
        <h2>{t(locale, "Entrar en un ranking nacional", "Open a national ranking")}</h2>
        <div className="badges">{categories.slice(0, 12).map((category) => <Link key={category.id} className="badge" href={`/${locale}/rankings/${category.slug}/${country.slug}`}>{locale === "en" ? category.nameEn : category.nameEs}</Link>)}</div>
      </section>
      <section className="section">
        <h2>{t(locale, "Empresas con sede publicada aquí", "Companies with a published HQ here")}</h2>
        {companies.length ? <div className="grid-cards">{companies.map((company) => <CompanyCard key={company.id} locale={locale} company={company} />)}</div> : <EmptyState title={name} body={ui(locale).emptyCatalog} />}
      </section>
    </div>
  );
}
