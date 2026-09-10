import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import {
  amountMatches,
  centsFromCharged,
  metadataFromPayload,
  parseWebhook,
  payloadFromMetadata,
  sessionIsPaid,
} from "./payments.js";

const payload = {
  handle: "@lunavarela",
  displayName: "Luna Varela",
  tagline: "glow",
  description: "bio corta",
  url: "https://instagram.com/lunavarela",
  platform: "instagram",
  country: "ES",
  category: "belleza",
  targetTotal: 15,
};

test("centsFromCharged converts USD dollars to Stripe cents", () => {
  assert.equal(centsFromCharged(10), 1000);
  assert.equal(centsFromCharged("5"), 500);
  assert.throws(() => centsFromCharged(0));
});

test("metadata round-trips a claim payload", () => {
  const meta = metadataFromPayload("c_test", payload, 10);
  const restored = payloadFromMetadata(meta);
  assert.equal(restored.handle, "@lunavarela");
  assert.equal(restored.displayName, "Luna Varela");
  assert.equal(restored.targetTotal, 15);
  assert.equal(restored.category, "belleza");
  assert.equal(meta.charged, "10");
  assert.equal(meta.claim_id, "c_test");
});

test("payloadFromMetadata rejects incomplete metadata", () => {
  assert.equal(payloadFromMetadata(null), null);
  assert.equal(payloadFromMetadata({ handle: "@x" }), null);
  assert.equal(payloadFromMetadata({ displayName: "X" }), null);
});

test("sessionIsPaid only accepts a verified paid Checkout session", () => {
  assert.equal(sessionIsPaid({ payment_status: "paid" }), true);
  assert.equal(sessionIsPaid({ status: "complete", payment_status: "paid" }), true);
  assert.equal(sessionIsPaid({ status: "complete", payment_status: "unpaid" }), false);
  assert.equal(sessionIsPaid({ payment_status: "unpaid" }), false);
  assert.equal(sessionIsPaid({ status: "open" }), false);
  assert.equal(sessionIsPaid(null), false);
});

test("amountMatches requires the charged USD total in cents", () => {
  const session = { amount_total: 1000, currency: "usd" };
  assert.equal(amountMatches(session, 10), true);
  assert.equal(amountMatches(session, 15), false);
  assert.equal(amountMatches({ amount_total: 1000, currency: "eur" }, 10), false);
});

test("parseWebhook verifies Stripe HMAC signatures", () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousWh = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = "sk_test_webhook_unit";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_unit";
  const payloadJson = JSON.stringify({
    id: "evt_test",
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test", payment_status: "paid" } },
  });
  const stripe = new Stripe("sk_test_webhook_unit");
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: payloadJson,
    secret: "whsec_test_secret_unit",
  });
  const event = parseWebhook(payloadJson, signature);
  assert.equal(event.type, "checkout.session.completed");
  assert.equal(event.data.object.id, "cs_test");
  assert.throws(() => parseWebhook(payloadJson, "t=1,v1=deadbeef"));
  if (previousKey == null) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = previousKey;
  if (previousWh == null) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = previousWh;
});
