import { CompanyCard } from "@/components/company-card";
import { CompanyTable } from "@/components/company-table";
import { EmptyState } from "@/components/empty-state";
import { Pager } from "@/components/pager";
import { SearchFilters } from "@/components/search-filters";
import { listCategories, listCities, listCountries, listTechnologies, searchCompanies } from "@/lib/catalog";
import { t, ui } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";
import { siteName } from "@/lib/site";
import { AdSlot } from "@/components/ad-slot";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Empresas", "Companies"), t(locale, `Directorio de empresas tecnológicas publicadas en ${siteName()}.`, `Directory of technology companies published on ${siteName()}.`), "/empresas");
}

export default async function CompaniesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const locale = await readLocale(params);
  const query = await searchParams;
  const page = Math.max(1, Number(query.page || 1) || 1);
  const [categories, countries, cities, technologies, result] = await Promise.all([
    listCategories(),
    listCountries(),
    listCities(),
    listTechnologies(),
    searchCompanies({
      q: query.q,
      categorySlug: query.categoria,
      countrySlug: query.pais,
      citySlug: query.ciudad,
      technologySlug: query.tecnologia,
      verified: query.verificada === "1",
      skip: (page - 1) * 20,
      take: 20,
    }),
  ]);
  const path = `/${locale}/empresas?q=${encodeURIComponent(query.q || "")}&categoria=${query.categoria || ""}&pais=${query.pais || ""}&ciudad=${query.ciudad || ""}&tecnologia=${query.tecnologia || ""}&verificada=${query.verificada || ""}`;
  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">{ui(locale).companies}</p>
        <h1>{t(locale, "Directorio", "Directory")}</h1>
        <p className="lede">{t(locale, "Solo fichas publicadas. Si el directorio está vacío, es porque todavía no hay empresas — no porque falte un relleno.", "Published profiles only. If the directory is empty, it is because there are no companies yet — not because filler is missing.")}</p>
      </section>
      <SearchFilters locale={locale} q={query.q} categories={categories} countries={countries} cities={cities} technologies={technologies} selected={query} />
      <div className="section">
        {result.total === 0 ? (
          <EmptyState
            title={t(locale, "Sin empresas", "No companies")}
            body={ui(locale).emptyCatalog}
            actions={[
              { href: `/${locale}/register`, label: t(locale, "Subir empresa", "Add a company") },
              { href: `/${locale}/precios`, label: t(locale, "Ver precios", "See pricing") },
            ]}
          />
        ) : (
          <>
            <CompanyTable locale={locale} companies={result.rows} />
            <div className="grid-cards" style={{ marginTop: 16 }}>
              {result.rows.map((company) => <CompanyCard key={company.id} locale={locale} company={company} />)}
            </div>
            <Pager locale={locale} page={page} total={result.total} pageSize={20} path={path} />
          </>
        )}
      </div>
      <AdSlot slot="directory" format="infeed" />
    </div>
  );
}
