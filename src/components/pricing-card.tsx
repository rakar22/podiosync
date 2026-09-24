import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { positionLabel, t } from "@/lib/i18n";

export function PricingCard({
  locale,
  position,
  priceCents,
  currency,
  durationDays,
  example,
  href,
}: {
  locale: string;
  position: string;
  priceCents: number | null;
  currency: string;
  durationDays: number;
  example?: boolean;
  href: string;
}) {
  return (
    <article className="price-card card">
      <span className="kicker">{durationDays} {t(locale, "días", "days")}</span>
      <h3>{positionLabel(locale, position)}</h3>
      <p className="rank-no">{priceCents == null ? "—" : formatMoney(priceCents, currency, locale)}</p>
      <p className="tiny">{t(locale, "Precio fijo configurable. No hay pujas ni desplazamientos.", "Fixed configurable price. No bids and no displacement.")}</p>
      {example ? <p className="tiny">{t(locale, "Precio de ejemplo guardado en la base de datos.", "Example price stored in the database.")}</p> : null}
      <Link className="btn btn-small" href={href}>{t(locale, "Elegir posición", "Choose position")}</Link>
    </article>
  );
}
