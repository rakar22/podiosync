import { listCities } from "@/lib/catalog";
import { json, limited } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = limited(request, "api-cities");
  if (blocked) return blocked;
  const rows = await listCities();
  return json({ data: rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name, isHub: row.isHub, country: { slug: row.country.slug, code: row.country.code } })) });
}
