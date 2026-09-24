import Link from "next/link";
import { formatMoney, daysLeft } from "@/lib/money";
import { positionLabel, t, ui } from "@/lib/i18n";
import { SponsoredBadge } from "./sponsored-badge";
import { joinWaitlist } from "@/server/actions";

export function SponsoredPositionCard({
  locale,
  position,
  priceCents,
  currency,
  example,
  occupied,
  company,
  endDate,
  buyHref,
  otherHref,
  categoryId,
  countryId,
  cityId,
}: {
  locale: string;
  position: string;
  priceCents: number | null;
  currency: string;
  example?: boolean;
  occupied: boolean;
  company?: { name: string; slug: string } | null;
  endDate?: Date | null;
  buyHref: string;
  otherHref: string;
  categoryId: string;
  countryId: string;
  cityId?: string | null;
}) {
  const left = daysLeft(endDate);
  return (
    <article className={`slot ${occupied ? "slot-occupied" : ""}`}>
      <div className="slot-top">
        <div>
          <div className="rank-no">{positionLabel(locale, position)}</div>
          <SponsoredBadge locale={locale} />
        </div>
        <strong>{priceCents == null ? t(locale, "Sin tarifa", "No price") : formatMoney(priceCents, currency, locale)}</strong>
      </div>
      <p className="tiny">{t(locale, "30 días · precio fijo de la regla aplicable", "30 days · fixed price from the matching rule")}</p>
      {example ? <p className="tiny">{t(locale, "Tarifa de ejemplo, editable por un admin.", "Example rate, editable by an admin.")}</p> : null}
      {occupied ? (
        <>
          <p><strong>{ui(locale).unavailable}.</strong> {company ? <Link href={`/${locale}/empresa/${company.slug}`}>{company.name}</Link> : null}</p>
          {left != null && left > 0 ? <p className="tiny">{t(locale, `Termina en ${left} días.`, `Ends in ${left} days.`)}</p> : null}
          <Link href={otherHref}>{ui(locale).seeOther}</Link>
          <form action={joinWaitlist} className="form-grid">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="categoryId" value={categoryId} />
            <input type="hidden" name="countryId" value={countryId} />
            <input type="hidden" name="cityId" value={cityId || ""} />
            <input type="hidden" name="position" value={position} />
            <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
            <input className="input" type="email" name="email" required placeholder={t(locale, "Tu email", "Your email")} aria-label="Email" />
            <button className="btn btn-ghost btn-small" type="submit">{ui(locale).waitlist}</button>
          </form>
        </>
      ) : (
        <Link className="btn btn-small" href={buyHref}>{ui(locale).buy}</Link>
      )}
    </article>
  );
}
