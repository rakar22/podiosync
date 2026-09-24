import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";
import { siteName } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Para empresas", "For companies"), t(locale, "Publica tu ficha y ocupa una posición patrocinada a precio fijo.", "Publish your profile and hold a sponsored position at a fixed price."), "/para-empresas");
}

export default async function ForCompaniesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const faqs = [
    { q: t(locale, "¿Qué compro exactamente?", "What exactly do I buy?"), a: t(locale, "Un periodo concreto en una posición de un tablero: categoría + país + ciudad (o país entero) + #1, #2, #3, Top 5, Destacada o Premium.", "A defined period on one board position: category + country + city (or the whole country) + #1, #2, #3, Top 5, Featured, or Premium.") },
    { q: t(locale, "¿Cuándo empieza?", "When does it start?"), a: t(locale, "Cuando Stripe confirma el pago. El webhook activa la campaña y la página de vuelta también lo confirma, de forma idempotente.", "When Stripe confirms the payment. The webhook activates the campaign, and the return page confirms it too, idempotently.") },
    { q: t(locale, "¿Puedo renovar?", "Can I renew?"), a: t(locale, "Sí. Si el hueco sigue siendo tuyo, la renovación alarga la fecha de fin. Si ya caducó y otra empresa lo ocupó, no desplazamos a nadie.", "Yes. If the slot is still yours, renewal extends the end date. If it expired and another company took it, nobody is displaced.") },
  ];
  return (
    <div className="wrap prose">
      <section className="hero">
        <p className="kicker">{t(locale, "Para empresas", "For companies")}</p>
        <h1>{t(locale, "Haz visible tu empresa donde te buscan.", "Make your company visible where people look.")}</h1>
        <p className="lede">{t(locale, `${siteName()} es un directorio B2B. Creas la ficha con los datos que quieres publicar, la reclamas y, si un hueco está libre, lo contratas a precio fijo. La etiqueta “Patrocinado” queda a la vista. El listado orgánico va debajo y no se compra.`, `${siteName()} is a B2B directory. You create the profile with the facts you want to publish, claim it, and if a slot is free you buy it at a fixed price. The “Sponsored” label stays visible. The organic list sits below and is not for sale.`)}</p>
      </section>
      <section className="steps">
        {[
          [t(locale, "Visibilidad", "Visibility"), t(locale, "Sales en el ranking de tu categoría, país y ciudad, separado de las fichas orgánicas.", "You appear on the ranking for your category, country, and city, apart from organic profiles.")],
          [t(locale, "Precio cerrado", "A closed price"), t(locale, "El importe lo marca la regla de administración. No hay puja ni desplazamiento por pagar más.", "Admin rules set the amount. There is no bid and no displacement by paying more.")],
          [t(locale, "Hueco único", "One slot"), t(locale, "Si está ocupado ves la lista de espera y el resto de posiciones. Si es tuyo, renuevas desde el panel.", "If it is taken you see the waitlist and the other positions. If it is yours, you renew from the dashboard.")],
        ].map(([title, body]) => <article className="card" key={title}><h2>{title}</h2><p>{body}</p></article>)}
      </section>
      <ol>
        <li>{t(locale, "Crea una cuenta y la ficha de tu empresa.", "Create an account and your company profile.")}</li>
        <li>{t(locale, "Elige categoría, ubicación, posición y duración. El precio sale de la regla vigente.", "Choose category, location, position, and duration. The price comes from the current rule.")}</li>
        <li>{t(locale, "Paga con Stripe. Si el hueco sigue libre al confirmarse el pago, la campaña se activa sola.", "Pay with Stripe. If the slot is still free when payment is confirmed, the campaign activates itself.")}</li>
        <li>{t(locale, "En el panel ves caducidad, leads y la renovación.", "The dashboard shows expiry, leads, and renewal.")}</li>
      </ol>
      <p>{t(locale, "No pedimos ni publicamos rondas de inversión, valoraciones ni reseñas. El rango de plantilla solo aparece si lo escribes tú.", "We do not ask for or publish funding rounds, valuations, or reviews. A headcount range appears only if you write it.")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="btn" href={`/${locale}/register`}>{t(locale, "Crear cuenta", "Create account")}</Link>
        <Link className="btn btn-ghost" href={`/${locale}/precios`}>{t(locale, "Ver precios", "See pricing")}</Link>
      </div>
      <section className="faq">
        {faqs.map((faq) => <details key={faq.q} open><summary>{faq.q}</summary><p>{faq.a}</p></details>)}
      </section>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) }} />
    </div>
  );
}
