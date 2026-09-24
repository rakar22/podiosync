import Link from "next/link";
import { countryName } from "@/lib/i18n";

export function CountryCard({ locale, country }: { locale: string; country: { slug: string; code: string; nameEs: string; nameEn: string } }) {
  return (
    <Link className="taxonomy-card" href={`/${locale}/paises/${country.slug}`}>
      <span className="tiny">{country.code}</span>
      <strong>{countryName(locale, country)}</strong>
    </Link>
  );
}
