import { activeRules } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { json, limited } from "@/lib/http";
import { POSITION_KEYS, resolvePrice, slotAvailability, type SlotView } from "@/lib/positions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = limited(request, "api-slots");
  if (blocked) return blocked;
  const url = new URL(request.url);
  const category = url.searchParams.get("categoryId")
    ? await prisma.category.findUnique({ where: { id: url.searchParams.get("categoryId") || "" } })
    : await prisma.category.findUnique({ where: { slug: url.searchParams.get("category") || "" } });
  const country = url.searchParams.get("countryId")
    ? await prisma.country.findUnique({ where: { id: url.searchParams.get("countryId") || "" } })
    : await prisma.country.findUnique({ where: { slug: url.searchParams.get("country") || "" } });
  if (!category || !country) return json({ error: "category_and_country_required" }, 400);
  const cityToken = url.searchParams.get("cityId") || url.searchParams.get("city") || "";
  const city = cityToken
    ? await prisma.city.findFirst({ where: { OR: [{ id: cityToken }, { slug: cityToken }] } })
    : null;
  const rules = await activeRules();
  const now = new Date();
  const slots = await prisma.sponsoredPosition.findMany({
    where: { categoryId: category.id, countryId: country.id, cityId: city?.id || null },
    include: { company: true },
  });
  return json({
    data: POSITION_KEYS.map((position) => {
      const related = slots.filter((slot) => slot.position === position);
      const views: SlotView[] = related.map((slot) => ({ id: slot.id, status: slot.status, companyId: slot.companyId, endDate: slot.endDate, holdUntil: slot.holdUntil }));
      const availability = slotAvailability(views, now);
      const active = related.find((slot) => slot.status === "ACTIVE" && slot.endDate && slot.endDate > now);
      const price = resolvePrice(rules, { position, categoryId: category.id, countryId: country.id, cityId: city?.id || null, durationDays: 30 });
      return {
        position,
        available: availability.available,
        price30: price ? { priceCents: price.priceCents, currency: price.currency, example: Boolean(price.example) } : null,
        holder: active?.company ? { name: active.company.name, slug: active.company.slug } : null,
      };
    }),
  });
}
