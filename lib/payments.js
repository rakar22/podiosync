import Stripe from "stripe";
import { fulfillPaid, getPendingRow, putPending } from "./store.js";

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

export function webhookSecret() {
  return (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
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

export function centsFromCharged(charged) {
  const n = Number(charged);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Importe inválido.");
  return Math.round(n * 100);
}

export function sessionIsPaid(session) {
  if (!session) return false;
  if (session.payment_status === "paid") return true;
  return session.status === "complete" && session.payment_status !== "unpaid";
}

export function amountMatches(session, charged) {
  if (charged == null || charged === "") return true;
  if (session?.amount_total == null) return true;
  const currency = String(session.currency || "usd").toLowerCase();
  if (currency && currency !== "usd") return false;
  try {
    return Number(session.amount_total) === centsFromCharged(charged);
  } catch {
    return false;
  }
}

export async function createCheckout({ claimId, payload, charged, origin }) {
  const stripe = getStripe();
  const meta = metadataFromPayload(claimId, payload, charged);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "es",
    client_reference_id: claimId,
    success_url: `${origin}/paid?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/claim?canceled=1`,
    submit_type: "pay",
    billing_address_collection: "auto",
    metadata: meta,
    payment_intent_data: {
      metadata: meta,
      description: `podiosync · ${payload.handle} · total $${payload.targetTotal}`,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: centsFromCharged(charged),
          product_data: {
            name: `podiosync · ${payload.handle}`,
            description: `Reclamar puesto · total $${payload.targetTotal}`,
          },
        },
      },
    ],
  });
  putPending(claimId, payload, { charged, sessionId: session.id, meta });
  putPending(session.id, payload, { charged, claimId, meta });
  return session;
}

export async function retrieveSession(sessionId) {
  return getStripe().checkout.sessions.retrieve(sessionId);
}

export function parseWebhook(rawBody, signature) {
  const secret = webhookSecret();
  if (!secret) {
    throw new Error("Falta STRIPE_WEBHOOK_SECRET");
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

function pendingForSession(session) {
  return (
    getPendingRow(session?.id) ||
    getPendingRow(session?.client_reference_id) ||
    getPendingRow(session?.metadata?.claim_id) ||
    null
  );
}

export async function confirmPaidSession(sessionId, sessionHint = null) {
  if (!sessionId) return { ok: false, error: "Falta session_id." };
  let session = sessionHint;
  try {
    session = await retrieveSession(sessionId);
  } catch (err) {
    if (!sessionHint) throw err;
  }
  if (!sessionIsPaid(session)) {
    return { ok: false, waiting: true, session };
  }
  const row = pendingForSession(session);
  const payload = row?.payload || payloadFromMetadata(session.metadata);
  if (!payload) {
    return { ok: false, paid: true, missing: true, session };
  }
  const charged = row?.charged ?? session.metadata?.charged;
  if (!amountMatches(session, charged)) {
    return { ok: false, error: "El importe cobrado no coincide con la reclamación.", session };
  }
  const result = fulfillPaid(session.id, payload);
  return { ...result, session, paid: true };
}
