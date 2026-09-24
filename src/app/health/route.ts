import { prisma } from "@/lib/db";
import { stripeMode } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const companies = await prisma.company.count();
    return Response.json({ ok: true, product: "TECHPODIO", companies, stripe: stripeMode() });
  } catch {
    return Response.json({ ok: false, product: "TECHPODIO" }, { status: 500 });
  }
}
