import { searchCompanies } from "@/lib/catalog";
import { limited, json, pageQuery } from "@/lib/http";
import { toPublicCompany } from "@/lib/public-company";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = limited(request, "api-companies");
  if (blocked) return blocked;
  const url = new URL(request.url);
  const { page, pageSize, skip } = pageQuery(url);
  const result = await searchCompanies({
    q: url.searchParams.get("q") || undefined,
    categorySlug: url.searchParams.get("category") || undefined,
    countrySlug: url.searchParams.get("country") || undefined,
    citySlug: url.searchParams.get("city") || undefined,
    technologySlug: url.searchParams.get("technology") || undefined,
    verified: url.searchParams.get("verified") === "1",
    skip,
    take: pageSize,
  });
  return json({ data: result.rows.map((row) => toPublicCompany(row)), page, pageSize, total: result.total });
}
