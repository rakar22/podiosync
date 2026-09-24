import { prisma } from "@/lib/db";
import { fulfillCheckoutSession } from "@/lib/checkout";
import { FULFILL_EVENT_TYPES, getStripe, webhookSecret } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature || !webhookSecret()) {
    return Response.json({ error: "missing_signature" }, { status: 400 });
  }
  try {
    const event = getStripe().webhooks.constructEvent(raw, signature, webhookSecret());
    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const payment = await prisma.payment.findFirst({ where: { OR: [{ stripeSessionId: session.id }, { id: session.metadata?.payment_id || "__none__" }] } });
      if (payment && payment.status === "PENDING") {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
        await prisma.sponsoredPosition.updateMany({ where: { paymentId: payment.id, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED" } });
        if (payment.campaignId) await prisma.campaign.updateMany({ where: { id: payment.campaignId, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED" } });
      }
    }
    if (FULFILL_EVENT_TYPES.has(event.type) && "id" in event.data.object) {
      await fulfillCheckoutSession(String(event.data.object.id));
    }
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "invalid_webhook" }, { status: 400 });
  }
}
