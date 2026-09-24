import Link from "next/link";
import { AdSlot } from "@/components/ad-slot";
import { CategoryCard } from "@/components/category-card";
import { CountryCard } from "@/components/country-card";
import { JsonLd } from "@/components/json-ld";
import { RankingBoard } from "@/components/ranking-board";
import { SearchBar } from "@/components/search-bar";
import { listCategories, listCountries, loadBoard } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { absolute, meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(
    locale,
    "TECHPODIO",
    t(locale, "Descubre las empresas que están construyendo la tecnología de Europa.", "Discover the companies building Europe’s technology."),
    "",
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const [categories, countries] = await Promise.all([listCategories(), listCountries()]);
  const ai = categories.find((item) => item.slug === "artificial-intelligence");
  const spain = countries.find((item) => item.code === "ES");
  const madrid = spain?.cities.find((item) => item.slug === "madrid");
  const board = ai && spain && madrid ? await loadBoard({ categoryId: ai.id, countryId: spain.id, cityId: madrid.id }) : null;
  const faqs = [
    {
      q: t(locale, "¿Las posiciones se subastan?", "Are positions auctioned?"),
      a: t(locale, "No. Cada posición tiene un precio fijo configurado en administración. Pagar no desplaza a quien ya la ocupa.", "No. Each position has a fixed price set in admin. Paying does not displace whoever already holds it."),
    },
    {
      q: t(locale, "¿El ranking orgánico se compra?", "Can the organic ranking be bought?"),
      a: t(locale, "No. Debajo de los espacios patrocinados, las fichas se ordenan por verificación y completitud. No inventamos métricas.", "No. Below the sponsored slots, profiles are ordered by verification and completeness. We do not invent metrics."),
    },
    {
      q: t(locale, "¿Hay empresas de ejemplo?", "Are there sample companies?"),
      a: t(locale, "El catálogo empieza vacío. Una ficha aparece cuando una empresa la crea o cuando se incorpora con una fuente identificable.", "The catalog starts empty. A profile appears when a company creates it or when it is added with an identifiable source."),
    },
  ];
  return (
    <div className="wrap">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "TECHPODIO",
            url: absolute(`/${locale}`),
            description: t(locale, "Directorio B2B de empresas tecnológicas en Europa.", "B2B directory of technology companies in Europe."),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "TECHPODIO",
            url: absolute(`/${locale}`),
            potentialAction: {
              "@type": "SearchAction",
              target: `${absolute(`/${locale}/buscar`)}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) },
        ]}
      />
      <section className="hero">
        <p className="kicker">{t(locale, "España → Europa", "Spain → Europe")}</p>
        <h1>{t(locale, "Descubre las empresas que están construyendo la tecnología de Europa.", "Discover the companies building Europe’s technology.")}</h1>
        <p className="lede">{t(locale, "Directorio para encontrar empresas tecnológicas y para que esas empresas ocupen una posición patrocinada — #1, #2, #3, Top 5, Destacada o Premium — a un precio fijo. Si el hueco está ocupado, no se lo quitamos a nadie.", "A directory for finding technology companies, and for those companies to hold a sponsored position — #1, #2, #3, Top 5, Featured, or Premium — at a fixed price. If the slot is taken, nobody gets pushed out.")}</p>
        <SearchBar locale={locale} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn" href={`/${locale}/para-empresas`}>{t(locale, "Soy una empresa", "I represent a company")}</Link>
          <Link className="btn btn-ghost" href={`/${locale}/rankings`}>{t(locale, "Ver rankings", "View rankings")}</Link>
        </div>
      </section>
      <section className="section steps">
        {[
          [t(locale, "01 · Mercado", "01 · Market"), t(locale, "Elige categoría, país y, si quieres, ciudad. Cada combinación tiene sus propios huecos.", "Choose a category, country, and optionally a city. Each combination has its own slots.")],
          [t(locale, "02 · Precio fijo", "02 · Fixed price"), t(locale, "El importe sale de las reglas de precio. Un admin puede cambiarlo sin volver a desplegar.", "The amount comes from pricing rules. An admin can change it without redeploying.")],
          [t(locale, "03 · Patrocinado", "03 · Sponsored"), t(locale, "La posición se etiqueta como patrocinada. El listado orgánico va aparte, debajo.", "The position is labelled sponsored. The organic list sits apart, underneath.")],
        ].map(([title, body]) => (
          <article className="card" key={title}>
            <p className="step-no">{title}</p>
            <p>{body}</p>
          </article>
        ))}
      </section>
      <section className="section">
        <div className="section-head">
          <h2>{t(locale, "Categorías", "Categories")}</h2>
          <Link href={`/${locale}/categorias`}>{t(locale, "Ver todas", "See all")}</Link>
        </div>
        <div className="grid-cards four">
          {categories.slice(0, 8).map((category) => <CategoryCard key={category.id} locale={locale} category={category} />)}
        </div>
      </section>
      {board && ai && spain && madrid ? (
        <section>
          <div className="section-head">
            <div>
              <p className="kicker">{t(locale, "Ejemplo de tablero", "Sample board")}</p>
              <h2>{t(locale, "Inteligencia artificial · Madrid", "Artificial intelligence · Madrid")}</h2>
            </div>
            <Link href={`/${locale}/rankings/${ai.slug}/${spain.slug}/${madrid.slug}`}>{t(locale, "Abrir ranking", "Open ranking")}</Link>
          </div>
          <RankingBoard locale={locale} board={board} categoryId={ai.id} countryId={spain.id} cityId={madrid.id} />
        </section>
      ) : null}
      <section className="section">
        <div className="section-head">
          <h2>{t(locale, "Países", "Countries")}</h2>
          <Link href={`/${locale}/paises`}>{t(locale, "Europa y Reino Unido", "Europe and the United Kingdom")}</Link>
        </div>
        <div className="grid-cards four">
          {countries.slice(0, 8).map((country) => <CountryCard key={country.id} locale={locale} country={country} />)}
        </div>
      </section>
      <section className="section card">
        <p className="kicker">TECHPODIO</p>
        <h2>{t(locale, "Un hueco, un precio, una etiqueta clara.", "One slot, one price, one clear label.")}</h2>
        <p className="muted">{t(locale, "Pensado primero para España y preparado para el resto de Europa. Sin pujas.", "Built first for Spain and ready for the rest of Europe. No bidding.")}</p>
        <Link className="btn" href={`/${locale}/precios`}>{t(locale, "Ver precios", "See pricing")}</Link>
      </section>
      <section className="section faq">
        <h2>FAQ</h2>
        {faqs.map((faq) => (
          <details key={faq.q} open>
            <summary>{faq.q}</summary>
            <p>{faq.a}</p>
          </details>
        ))}
      </section>
      <AdSlot slot="home-footer" />
    </div>
  );
}
