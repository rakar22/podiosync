import { listCategories } from "@/lib/catalog";
import { json, limited } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = limited(request, "api-categories");
  if (blocked) return blocked;
  const rows = await listCategories();
  return json({
    data: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      nameEs: row.nameEs,
      nameEn: row.nameEn,
      descriptionEs: row.descriptionEs,
      descriptionEn: row.descriptionEn,
      group: row.group,
      parent: row.parent ? { slug: row.parent.slug } : null,
    })),
  });
}
