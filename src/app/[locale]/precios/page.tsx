import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PricingCard } from "@/components/pricing-card";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { POSITION_KEYS } from "@/lib/positions";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Precios", "Pricing"), t(locale, "Posiciones patrocinadas a precio fijo. Las tarifas viven en la base de datos.", "Sponsored positions at a fixed price. Rates live in the database."), "/precios");
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const rules = await prisma.pricingRule.findMany({
    where: { active: true, categoryId: null, countryId: null, cityId: null },
    orderBy: { durationDays: "asc" },
  });
  const faqs = [
    { q: t(locale, "¿Puedo pujar más para subir?", "Can I bid more to move up?"), a: t(locale, "No. El precio de cada hueco es el de la regla activa. No hay subasta.", "No. The price of each slot is the active rule. There is no auction.") },
    { q: t(locale, "¿Quién cambia los precios?", "Who changes prices?"), a: t(locale, "Un administrador, desde /admin/precios, sin redeploy.", "An administrator, from /admin/precios, without a redeploy.") },
    { q: t(locale, "¿Qué pasa si está ocupada?", "What if it is taken?"), a: t(locale, "Verás “Actualmente no disponible”, otras posiciones y un aviso para cuando se libere.", "You will see “Currently unavailable”, other positions, and an alert for when it frees up.") },
  ];
  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">{t(locale, "Precio fijo", "Fixed price")}</p>
        <h1>{t(locale, "Posiciones patrocinadas", "Sponsored positions")}</h1>
        <p className="lede">{t(locale, "Estas cifras son las reglas base activas (sin categoría ni país). Una regla más específica —por categoría, país o ciudad— sustituye a la base en ese ámbito. Los importes de ejemplo se pueden cambiar en administración.", "These figures are the active base rules (no category or country). A more specific rule — by category, country, or city — replaces the base in that scope. Example amounts can be changed in admin.")}</p>
        <Link className="btn" href={`/${locale}/comprar`}>{t(locale, "Elegir un hueco", "Choose a slot")}</Link>
      </section>
      <div className="grid-cards">
        {POSITION_KEYS.map((position) => {
          const related = rules.filter((rule) => rule.position === position);
          const month = related.find((rule) => rule.durationDays === 30) || related[0];
          if (!month) return null;
          return (
            <div key={position}>
              <PricingCard locale={locale} position={position} priceCents={month.priceCents} currency={month.currency} durationDays={month.durationDays} example={month.example} href={`/${locale}/comprar?position=${position}`} />
              <p className="tiny">{related.map((rule) => `${rule.durationDays}d ${formatMoney(rule.priceCents, rule.currency, locale)}`).join(" · ")}</p>
            </div>
          );
        })}
      </div>
      <section className="section faq">
        {faqs.map((faq) => <details key={faq.q} open><summary>{faq.q}</summary><p>{faq.a}</p></details>)}
      </section>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) }} />
    </div>
  );
}
