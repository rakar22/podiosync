import { t, ui } from "@/lib/i18n";
import { RankingTable } from "./ranking-table";
import { SponsoredPositionCard } from "./sponsored-position-card";
import type { loadBoard } from "@/lib/catalog";

type Board = Awaited<ReturnType<typeof loadBoard>>;

export function RankingBoard({
  locale,
  board,
  categoryId,
  countryId,
  cityId,
}: {
  locale: string;
  board: Board;
  categoryId: string;
  countryId: string;
  cityId?: string | null;
}) {
  const labels = ui(locale);
  return (
    <div className="section">
      <div className="section-head">
        <h2>{labels.sponsored}</h2>
      </div>
      <p className="tiny">{t(locale, "Espacio publicitario a precio fijo. Ocupar una posición no significa liderazgo de mercado.", "Advertising space at a fixed price. Holding a position does not mean market leadership.")}</p>
      <div className="grid-cards">
        {board.sponsored.map((slot) => {
          const params = new URLSearchParams({ categoryId, countryId, position: slot.position });
          if (cityId) params.set("cityId", cityId);
          return (
            <SponsoredPositionCard
              key={slot.position}
              locale={locale}
              position={slot.position}
              priceCents={slot.price30?.priceCents ?? null}
              currency={slot.price30?.currency || "eur"}
              example={slot.price30?.example}
              occupied={!slot.availability.available}
              company={slot.active?.company ? { name: slot.active.company.name, slug: slot.active.company.slug } : null}
              endDate={slot.active?.endDate}
              buyHref={`/${locale}/comprar?${params.toString()}`}
              categoryId={categoryId}
              countryId={countryId}
              cityId={cityId}
            />
          );
        })}
      </div>
      <div className="section-head" style={{ marginTop: 22 }}>
        <h2>{labels.organic}</h2>
      </div>
      <p className="tiny">{t(locale, "Orden de completitud y verificación de fichas publicadas en este ámbito. No usa financiación, plantilla ni reseñas inventadas.", "Order by completeness and verification of profiles published in this scope. It does not use invented funding, headcount, or reviews.")}</p>
      <RankingTable locale={locale} rows={board.organic.map((row) => ({ company: row.company, score: row.score, factors: row.factors }))} />
    </div>
  );
}
