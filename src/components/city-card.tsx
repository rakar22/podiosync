import Link from "next/link";

export function CityCard({ locale, city }: { locale: string; city: { slug: string; name: string; country: { nameEs: string; nameEn: string } } }) {
  return (
    <Link className="taxonomy-card" href={`/${locale}/ciudades/${city.slug}`}>
      <strong>{city.name}</strong>
      <span className="tiny">{locale === "en" ? city.country.nameEn : city.country.nameEs}</span>
    </Link>
  );
}
