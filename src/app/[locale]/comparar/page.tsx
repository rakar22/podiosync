import { CompanyTable } from "@/components/company-table";
import { EmptyState } from "@/components/empty-state";
import { companyInclude } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { categoryName, countryName, t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Comparar", "Compare"), t(locale, "Compara fichas públicas. Sin métricas inventadas.", "Compare public profiles. No invented metrics."), "/comparar");
}

export default async function ComparePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const locale = await readLocale(params);
  const query = await searchParams;
  const slugs = [query.a, query.b, query.c].map((item) => item?.trim()).filter((item): item is string => Boolean(item));
  const companies = slugs.length ? await prisma.company.findMany({ where: { slug: { in: slugs }, isDemo: false }, include: companyInclude }) : [];
  const fields = [
    [t(locale, "Sede", "HQ"), (company: (typeof companies)[number]) => [company.city?.name, company.country ? countryName(locale, company.country) : null].filter(Boolean).join(", ")],
    [t(locale, "Categorías", "Categories"), (company: (typeof companies)[number]) => company.categories.map((item) => categoryName(locale, item.category)).join(", ")],
    [t(locale, "Tecnologías declaradas", "Declared technologies"), (company: (typeof companies)[number]) => company.technologies.map((item) => item.technology.name).join(", ")],
    [t(locale, "Web", "Website"), (company: (typeof companies)[number]) => company.website || ""],
    [t(locale, "Verificación", "Verification"), (company: (typeof companies)[number]) => company.verificationStatus],
    [t(locale, "Fundación declarada", "Declared founding year"), (company: (typeof companies)[number]) => company.foundedYear ? String(company.foundedYear) : ""],
    [t(locale, "Plantilla declarada", "Declared headcount"), (company: (typeof companies)[number]) => company.employeeRange || ""],
  ] as const;
  return (
    <div className="wrap">
      <section className="hero">
        <h1>{t(locale, "Comparar fichas", "Compare profiles")}</h1>
        <p className="lede">{t(locale, "Hasta tres empresas, solo con campos públicos. No hay puntuaciones de mercado ni reseñas.", "Up to three companies, public fields only. There are no market scores or reviews.")}</p>
      </section>
      <form className="filters" action={`/${locale}/comparar`} method="get">
        <input className="input" name="a" defaultValue={query.a || ""} placeholder="slug" aria-label="A" />
        <input className="input" name="b" defaultValue={query.b || ""} placeholder="slug" aria-label="B" />
        <input className="input" name="c" defaultValue={query.c || ""} placeholder="slug" aria-label="C" />
        <button className="btn" type="submit">{t(locale, "Comparar", "Compare")}</button>
      </form>
      {companies.length === 0 ? <EmptyState title={t(locale, "Nada que comparar", "Nothing to compare")} body={t(locale, "Cuando haya fichas, escribe sus slugs. El directorio puede estar vacío.", "When profiles exist, enter their slugs. The directory may be empty.")} /> : (
        <>
          <CompanyTable locale={locale} companies={companies} />
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead><tr><th></th>{companies.map((company) => <th key={company.id}>{company.name}</th>)}</tr></thead>
              <tbody>
                {fields.map(([label, read]) => (
                  <tr key={label}><th>{label}</th>{companies.map((company) => <td key={company.id}>{read(company) || "—"}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
