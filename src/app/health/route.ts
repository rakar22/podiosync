import { prisma } from "@/lib/db";
import { legalIdentity, siteName } from "@/lib/site";
import { stripeEnabled, stripeMode, webhookSecret } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const product = siteName();
  const legal = legalIdentity();
  const base = {
    product,
    stripe: stripeMode(),
    stripeConfigured: stripeEnabled(),
    webhookSecretPresent: Boolean(webhookSecret()),
    legalConfigured: legal.configured,
    cronSecretPresent: Boolean(process.env.CRON_SECRET?.trim()),
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim()),
  };
  try {
    const companies = await prisma.company.count();
    return Response.json({ ok: true, database: "ok", companies, ...base });
  } catch {
    return Response.json({ ok: false, database: "unreachable", ...base }, { status: 500 });
  }
}
