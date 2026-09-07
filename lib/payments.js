import Stripe from "stripe";

export function stripeKey() {
  return (process.env.STRIPE_SECRET_KEY || "").trim();
}

export function stripeMode() {
  const k = stripeKey();
  if (k.startsWith("sk_live_")) return "live";
  if (k.startsWith("sk_test_")) return "test";
  if (k) return "on";
  return "off";
}

export function stripeEnabled() {
  return stripeMode() !== "off";
}

export function getStripe() {
  const k = stripeKey();
  if (!k) throw new Error("Falta STRIPE_SECRET_KEY");
  return new Stripe(k);
}

export function originFrom(req) {
  const env = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  if (env) return env;
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https")
    .split(",")[0]
    .trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  if (!host) return "";
  return `${proto}://${host}`;
}

function clip(v, n) {
  return String(v ?? "").slice(0, n);
}

export function metadataFromPayload(claimId, payload, charged) {
  return {
    claim_id: clip(claimId, 80),
    handle: clip(payload.handle, 80),
    displayName: clip(payload.displayName, 80),
    tagline: clip(payload.tagline, 80),
    description: clip(payload.description, 400),
    url: clip(payload.url, 200),
    platform: clip(payload.platform || "instagram", 20),
    country: clip(payload.country || "ES", 4),
    category: clip(payload.category, 40),
    targetTotal: String(payload.targetTotal),
    charged: String(charged),
  };
}

export function payloadFromMetadata(meta) {
  if (!meta?.handle || !meta?.displayName) return null;
  return {
    handle: meta.handle,
    displayName: meta.displayName,
    tagline: meta.tagline || "",
    description: meta.description || "",
    url: meta.url || "",
    platform: meta.platform || "instagram",
    country: meta.country || "ES",
    category: meta.category,
    targetTotal: Number(meta.targetTotal),
  };
}

export async function createCheckout({ claimId, payload, charged, origin }) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "es",
    client_reference_id: claimId,
    success_url: `${origin}/paid?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/claim?canceled=1`,
    submit_type: "pay",
    billing_address_collection: "auto",
    metadata: metadataFromPayload(claimId, payload, charged),
    payment_intent_data: {
      metadata: metadataFromPayload(claimId, payload, charged),
      description: `podiosync · ${payload.handle} · total $${payload.targetTotal}`,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: charged * 100,
          product_data: {
            name: `podiosync · ${payload.handle}`,
            description: `Reclamar puesto · total $${payload.targetTotal}`,
          },
        },
      },
    ],
  });
  return session;
}

export async function retrieveSession(sessionId) {
  return getStripe().checkout.sessions.retrieve(sessionId);
}

export function parseWebhook(rawBody, signature) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    throw new Error("Falta STRIPE_WEBHOOK_SECRET");
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

export function sessionIsPaid(session) {
  if (!session) return false;
  if (session.payment_status === "paid") return true;
  return session.status === "complete" && session.payment_status !== "unpaid";
}
