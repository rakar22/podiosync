import { loadBoard } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { json, limited } from "@/lib/http";
import { toPublicCompany } from "@/lib/public-company";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = limited(request, "api-rankings");
  if (blocked) return blocked;
  const url = new URL(request.url);
  const category = await prisma.category.findUnique({ where: { slug: url.searchParams.get("category") || "" } });
  const country = await prisma.country.findUnique({ where: { slug: url.searchParams.get("country") || "" } });
  if (!category || !country) return json({ error: "category_and_country_required" }, 400);
  const city = url.searchParams.get("city") ? await prisma.city.findUnique({ where: { slug: url.searchParams.get("city") || "" } }) : null;
  if (url.searchParams.get("city") && (!city || city.countryId !== country.id)) return json({ error: "city_not_found" }, 404);
  const board = await loadBoard({ categoryId: category.id, countryId: country.id, cityId: city?.id || null });
  return json({
    data: {
      sponsored: board.sponsored.map((slot) => ({
        position: slot.position,
        available: slot.availability.available,
        price30: slot.price30 ? { priceCents: slot.price30.priceCents, currency: slot.price30.currency, example: Boolean(slot.price30.example) } : null,
        company: slot.active?.company ? toPublicCompany(slot.active.company) : null,
        endDate: slot.active?.endDate,
      })),
      organic: board.organic.map((row) => ({ score: row.score, factors: row.factors, company: toPublicCompany(row.company) })),
    },
  });
}
