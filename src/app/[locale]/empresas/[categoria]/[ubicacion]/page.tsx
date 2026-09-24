import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CompanyCard } from "@/components/company-card";
import { EmptyState } from "@/components/empty-state";
import { JsonLd } from "@/components/json-ld";
import { companyInclude } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { categoryName, countryName, t, ui } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; categoria: string; ubicacion: string }> }) {
  const { locale, categoria, ubicacion } = await params;
  if (!isLocale(locale)) return {};
  const category = await prisma.category.findUnique({ where: { slug: categoria } });
  const city = await prisma.city.findUnique({ where: { slug: ubicacion }, include: { country: true } });
  const country = city ? city.country : await prisma.country.findUnique({ where: { slug: ubicacion } });
  if (!category || !country) return {};
  const name = categoryName(locale, category);
  const place = city ? city.name : countryName(locale, country);
  return meta(locale, t(locale, `Empresas de ${name} en ${place}`, `${name} companies in ${place}`), locale === "en" ? category.descriptionEn : category.descriptionEs, `/empresas/${categoria}/${ubicacion}`);
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string; categoria: string; ubicacion: string }> }) {
  const { locale, categoria, ubicacion } = await params;
  if (!isLocale(locale)) notFound();
  const category = await prisma.category.findUnique({ where: { slug: categoria } });
  const city = await prisma.city.findUnique({ where: { slug: ubicacion }, include: { country: true } });
  const country = city ? city.country : await prisma.country.findUnique({ where: { slug: ubicacion } });
  if (!category || !country) notFound();
  const name = categoryName(locale, category);
  const place = city ? city.name : countryName(locale, country);
  const companies = await prisma.company.findMany({
    where: {
      isDemo: false,
      categories: { some: { categoryId: category.id } },
      ...(city ? { cityId: city.id } : { countryId: country.id }),
    },
    include: companyInclude,
    orderBy: { name: "asc" },
    take: 24,
  });
  const siblings = city
    ? await prisma.city.findMany({ where: { countryId: country.id, NOT: { id: city.id } }, take: 6, orderBy: { name: "asc" } })
    : await prisma.city.findMany({ where: { countryId: country.id }, take: 6, orderBy: { name: "asc" } });
  const ranking = city ? `/${locale}/rankings/${category.slug}/${country.slug}/${city.slug}` : `/${locale}/rankings/${category.slug}/${country.slug}`;
  const faqs = [
    {
      q: t(locale, `¿Quién aparece en ${name} en ${place}?`, `Who appears in ${name} in ${place}?`),
      a: t(locale, "Empresas con ficha publicada en esa categoría y con esa sede. No rellenamos el listado con compañías inventadas.", "Companies with a published profile in that category and that location. We do not fill the list with invented companies."),
    },
    {
      q: t(locale, "¿Cómo se contrata una posición patrocinada?", "How do you buy a sponsored position?"),
      a: t(locale, "A precio fijo, si el hueco de esa categoría, país, ciudad y posición está libre. El pago en Stripe activa la campaña.", "At a fixed price, if the slot for that category, country, city, and position is free. Stripe payment activates the campaign."),
    },
    {
      q: t(locale, "¿El orden orgánico es una cuota de mercado?", "Is the organic order a market share?"),
      a: t(locale, "No. Ordena fichas por verificación y campos publicados.", "No. It orders profiles by verification and published fields."),
    },
  ];
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ href: `/${locale}`, label: "TECHPODIO" }, { href: `/${locale}/categorias/${category.slug}`, label: name }, { href: city ? `/${locale}/ciudades/${city.slug}` : `/${locale}/paises/${country.slug}`, label: place }, { label: t(locale, "Directorio", "Directory") }]} />
      <section className="hero">
        <p className="kicker">{t(locale, "Directorio", "Directory")}</p>
        <h1>{t(locale, `Empresas de ${name} en ${place}`, `${name} companies in ${place}`)}</h1>
        <p className="lede">{t(
          locale,
          `${name} en ${place} reúne fichas reales de TECHPODIO. Las posiciones #1, #2, #3, Top 5, Destacada y Premium de este ámbito se compran a precio fijo y se etiquetan como patrocinadas. El listado de abajo es orgánico: solo empresas que han publicado sede y categoría. ${locale === "en" ? "" : ""}${locale === "es" ? category.descriptionEs : category.descriptionEn}`,
          `${name} in ${place} gathers real TECHPODIO profiles. Positions #1, #2, #3, Top 5, Featured, and Premium in this scope are bought at a fixed price and labelled sponsored. The list below is organic: only companies that published a location and category. ${category.descriptionEn}`,
        )}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn" href={ranking}>{t(locale, "Ver ranking y precios del hueco", "See the ranking and slot prices")}</Link>
          <Link className="btn btn-ghost" href={`/${locale}/precios`}>{t(locale, "Cómo funcionan los precios", "How pricing works")}</Link>
        </div>
      </section>
      <section className="section">
        <h2>{t(locale, "Empresas publicadas", "Published companies")} ({companies.length})</h2>
        {companies.length ? <div className="grid-cards">{companies.map((company) => <CompanyCard key={company.id} locale={locale} company={company} />)}</div> : <EmptyState title={place} body={ui(locale).emptyCatalog} />}
      </section>
      <section className="section">
        <h2>{t(locale, "También en este mapa", "Also on this map")}</h2>
        <div className="badges">
          {siblings.map((item) => <Link key={item.id} className="badge" href={`/${locale}/empresas/${category.slug}/${item.slug}`}>{item.name}</Link>)}
          <Link className="badge" href={`/${locale}/categorias/${category.slug}`}>{name}</Link>
          <Link className="badge" href={`/${locale}/paises/${country.slug}`}>{countryName(locale, country)}</Link>
        </div>
      </section>
      <section className="section faq">
        {faqs.map((faq) => <details key={faq.q} open><summary>{faq.q}</summary><p>{faq.a}</p></details>)}
      </section>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) }} />
    </div>
  );
}
