import Link from "next/link";
import { categoryName, countryName, t } from "@/lib/i18n";
import type { CardCompany } from "./company-card";
import { SponsoredBadge } from "./sponsored-badge";

export function CompanyTable({ locale, companies, sponsoredIds = [] }: { locale: string; companies: CardCompany[]; sponsoredIds?: string[] }) {
  if (!companies.length) return null;
  const sponsored = new Set(sponsoredIds);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t(locale, "Empresa", "Company")}</th>
            <th>{t(locale, "Categoría", "Category")}</th>
            <th>{t(locale, "Ubicación", "Location")}</th>
            <th>{t(locale, "Estado", "Status")}</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.slug}>
              <td>
                <Link href={`/${locale}/empresa/${company.slug}`}>{company.name}</Link>
                {sponsored.has(company.slug) ? <> <SponsoredBadge locale={locale} /></> : null}
              </td>
              <td>{company.categories[0] ? categoryName(locale, company.categories[0].category) : "—"}</td>
              <td>{[company.city?.name, company.country ? countryName(locale, company.country) : null].filter(Boolean).join(", ") || "—"}</td>
              <td>{company.verificationStatus === "VERIFIED" ? t(locale, "Verificada", "Verified") : company.claimed ? t(locale, "Reclamada", "Claimed") : t(locale, "Sin reclamar", "Unclaimed")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
