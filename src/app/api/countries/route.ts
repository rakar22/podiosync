import { listCountries } from "@/lib/catalog";
import { json, limited } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = limited(request, "api-countries");
  if (blocked) return blocked;
  const rows = await listCountries();
  return json({ data: rows.map((row) => ({ id: row.id, code: row.code, slug: row.slug, nameEs: row.nameEs, nameEn: row.nameEn, cities: row.cities.map((city) => ({ id: city.id, slug: city.slug, name: city.name, isHub: city.isHub })) })) });
}
