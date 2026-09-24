import Link from "next/link";
import { categoryName, countryName, t } from "@/lib/i18n";
import { PremiumBadge } from "./premium-badge";
import { SponsoredBadge } from "./sponsored-badge";
import { VerifiedBadge } from "./verified-badge";

export type CardCompany = {
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  verificationStatus: string;
  claimed: boolean;
  premium: boolean;
  isDemo: boolean;
  city?: { name: string } | null;
  country?: { nameEs: string; nameEn: string } | null;
  categories: { category: { nameEs: string; nameEn: string } }[];
};

export function CompanyCard({ locale, company, sponsored = false }: { locale: string; company: CardCompany; sponsored?: boolean }) {
  const place = [company.city?.name, company.country ? countryName(locale, company.country) : null].filter(Boolean).join(", ");
  return (
    <article className="card">
      <div className="badges">
        {sponsored ? <SponsoredBadge locale={locale} /> : null}
        {company.verificationStatus === "VERIFIED" ? <VerifiedBadge locale={locale} /> : null}
        {company.premium ? <PremiumBadge locale={locale} /> : null}
        {company.isDemo ? <span className="badge badge-demo">{t(locale, "Demo", "Demo")}</span> : null}
      </div>
      <h3><Link href={`/${locale}/empresa/${company.slug}`}>{company.name}</Link></h3>
      <p className="tiny">{place || t(locale, "Ubicación no publicada", "Location not published")}</p>
      <p>{company.shortDescription || company.description || t(locale, "Sin descripción publicada.", "No published description.")}</p>
      <div className="tiny">{company.categories.slice(0, 3).map((item) => categoryName(locale, item.category)).join(" · ")}</div>
    </article>
  );
}
