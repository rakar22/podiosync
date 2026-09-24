import { TechnologyCard } from "@/components/technology-card";
import { listTechnologies } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Tecnologías", "Technologies"), t(locale, "Tecnologías que una empresa puede declarar en su ficha.", "Technologies a company can declare on its profile."), "/tecnologias");
}

export default async function TechnologiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const technologies = await listTechnologies();
  return (
    <div className="wrap">
      <section className="hero">
        <h1>{t(locale, "Tecnologías", "Technologies")}</h1>
        <p className="lede">{t(locale, "Una tecnología aparece en una empresa solo si esa empresa la declara. El directorio no infiere stacks.", "A technology appears on a company only if that company declares it. The directory does not infer stacks.")}</p>
      </section>
      <div className="grid-cards">{technologies.map((technology) => <TechnologyCard key={technology.id} locale={locale} technology={technology} />)}</div>
    </div>
  );
}
