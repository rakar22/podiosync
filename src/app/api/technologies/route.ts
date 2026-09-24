import { listTechnologies } from "@/lib/catalog";
import { json, limited } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = limited(request, "api-technologies");
  if (blocked) return blocked;
  const rows = await listTechnologies();
  return json({ data: rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name, descriptionEs: row.descriptionEs, descriptionEn: row.descriptionEn })) });
}
