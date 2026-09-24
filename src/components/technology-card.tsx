import Link from "next/link";

export function TechnologyCard({ locale, technology }: { locale: string; technology: { slug: string; name: string; descriptionEs: string; descriptionEn: string } }) {
  return (
    <Link className="taxonomy-card" href={`/${locale}/tecnologias/${technology.slug}`}>
      <strong>{technology.name}</strong>
      <span className="tiny">{locale === "en" ? technology.descriptionEn : technology.descriptionEs}</span>
    </Link>
  );
}
