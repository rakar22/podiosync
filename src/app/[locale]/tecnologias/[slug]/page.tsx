import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CompanyCard } from "@/components/company-card";
import { EmptyState } from "@/components/empty-state";
import { companyInclude } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { t, ui } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, ...rest } = await params;
  const locale = await readLocale(Promise.resolve(rest));
  const technology = await prisma.technology.findUnique({ where: { slug } });
  if (!technology) return {};
  return meta(locale, technology.name, locale === "en" ? technology.descriptionEn : technology.descriptionEs, `/tecnologias/${slug}`);
}

export default async function TechnologyPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, ...rest } = await params;
  const locale = await readLocale(Promise.resolve(rest));
  const technology = await prisma.technology.findUnique({ where: { slug } });
  if (!technology) notFound();
  const companies = await prisma.company.findMany({
    where: { isDemo: false, technologies: { some: { technologyId: technology.id } } },
    include: companyInclude,
    orderBy: { name: "asc" },
  });
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ href: `/${locale}`, label: "TECHPODIO" }, { href: `/${locale}/tecnologias`, label: t(locale, "Tecnologías", "Technologies") }, { label: technology.name }]} />
      <section className="hero">
        <h1>{technology.name}</h1>
        <p className="lede">{locale === "en" ? technology.descriptionEn : technology.descriptionEs}</p>
      </section>
      {companies.length ? <div className="grid-cards">{companies.map((company) => <CompanyCard key={company.id} locale={locale} company={company} />)}</div> : <EmptyState title={technology.name} body={ui(locale).emptyCatalog} />}
    </div>
  );
}
