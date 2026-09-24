import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CompanyCard } from "@/components/company-card";
import { CompanyProfile } from "@/components/company-profile";
import { JsonLd } from "@/components/json-ld";
import { currentUser } from "@/lib/auth";
import { companyInclude } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { categoryName, t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { absolute, meta } from "@/lib/seo";
import { Flash } from "@/components/flash";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = await readLocale(Promise.resolve({ locale: raw }));
  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) return {};
  return meta(locale, company.name, company.shortDescription || company.description || company.name, `/empresa/${slug}`);
}

export default async function CompanyPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug, ...rest } = await params;
  const locale = await readLocale(Promise.resolve(rest));
  const query = await searchParams;
  const company = await prisma.company.findUnique({ where: { slug }, include: companyInclude });
  if (!company) notFound();
  const user = await currentUser();
  const [sponsored, favorite, related] = await Promise.all([
    prisma.sponsoredPosition.findFirst({ where: { companyId: company.id, status: "ACTIVE", endDate: { gt: new Date() } } }),
    user ? prisma.favorite.findUnique({ where: { userId_companyId: { userId: user.id, companyId: company.id } } }) : null,
    prisma.company.findMany({
      where: { id: { not: company.id }, isDemo: false, categories: { some: { categoryId: { in: company.categories.map((item) => item.categoryId) } } } },
      include: companyInclude,
      take: 3,
    }),
  ]);
  const place = company.city?.name || (company.country ? (locale === "en" ? company.country.nameEn : company.country.nameEs) : undefined);
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ href: `/${locale}`, label: "TECHPODIO" }, { href: `/${locale}/empresas`, label: t(locale, "Empresas", "Companies") }, { label: company.name }]} />
      <Flash locale={locale} ok={query.ok} error={query.error} />
      <div className="section">
        <CompanyProfile locale={locale} company={company} sponsored={Boolean(sponsored)} loggedIn={Boolean(user)} favored={Boolean(favorite)} />
      </div>
      {related.length ? (
        <section className="section">
          <h2>{t(locale, "Otras fichas de la misma categoría", "Other profiles in the same category")}</h2>
          <div className="grid-cards">{related.map((item) => <CompanyCard key={item.id} locale={locale} company={item} />)}</div>
        </section>
      ) : null}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: company.name,
          url: company.website || absolute(`/${locale}/empresa/${company.slug}`),
          description: company.shortDescription || company.description || undefined,
          areaServed: place,
          knowsAbout: company.categories.map((item) => categoryName(locale, item.category)),
        }}
      />
    </div>
  );
}
