import Link from "next/link";
import { factorLabel } from "@/lib/labels";
import { t } from "@/lib/i18n";
import type { CardCompany } from "./company-card";

export function RankingTable({
  locale,
  rows,
}: {
  locale: string;
  rows: { company: CardCompany; score: number; factors: string[] }[];
}) {
  if (!rows.length) {
    return <p className="muted">{t(locale, "Ninguna ficha orgánica en este ámbito todavía.", "No organic profiles in this scope yet.")}</p>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>{t(locale, "Empresa", "Company")}</th>
            <th>{t(locale, "Completitud de ficha", "Profile completeness")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.company.slug}>
              <td>{index + 1}</td>
              <td><Link href={`/${locale}/empresa/${row.company.slug}`}>{row.company.name}</Link></td>
              <td>{row.factors.map((factor) => factorLabel(locale, factor)).join(" · ") || t(locale, "Ficha básica", "Basic profile")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
