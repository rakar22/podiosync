import Link from "next/link";
import { categoryName } from "@/lib/i18n";

export function CategoryCard({ locale, category, href }: { locale: string; href?: string; category: { slug: string; nameEs: string; nameEn: string; descriptionEs: string; descriptionEn: string } }) {
  const name = categoryName(locale, category);
  return (
    <Link className="taxonomy-card" href={href || `/${locale}/categorias/${category.slug}`}>
      <strong>{name}</strong>
      <span className="tiny">{locale === "en" ? category.descriptionEn : category.descriptionEs}</span>
    </Link>
  );
}
