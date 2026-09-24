import { z } from "zod";
import { trackEvent } from "@/lib/audit";
import { json, limited } from "@/lib/http";

const schema = z.object({
  name: z.enum(["page_view", "search", "ranking_view", "outbound_website", "compare_view"]),
  path: z.string().max(300).optional(),
  locale: z.string().max(8).optional(),
});

export async function POST(request: Request) {
  const blocked = limited(request, "api-analytics");
  if (blocked) return blocked;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid" }, 400);
  await trackEvent({ name: parsed.data.name, path: parsed.data.path, locale: parsed.data.locale });
  return json({ ok: true });
}
