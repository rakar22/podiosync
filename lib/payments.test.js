import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import Stripe from "stripe";
import {
  amountMatches,
  centsFromCharged,
  confirmPaidSession,
  FULFILL_EVENT_TYPES,
  metadataFromPayload,
  parseWebhook,
  payloadFromMetadata,
  publicPaymentError,
  sessionIsPaid,
  stripeKey,
  stripeMode,
} from "./payments.js";
import { listBoard } from "./store.js";

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

test("stripeMode sanitizes quoted keys and recognizes live/restricted secrets", () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = '"sk_live_abc"';
  assert.equal(stripeKey(), "sk_live_abc");
  assert.equal(stripeMode(), "live");
  process.env.STRIPE_SECRET_KEY = "rk_test_abc";
  assert.equal(stripeMode(), "test");
  process.env.STRIPE_SECRET_KEY = "";
  assert.equal(stripeMode(), "off");
  if (previous == null) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = previous;
});

test("publicPaymentError hides raw Stripe session misses", () => {
  assert.match(
    publicPaymentError(new Error("No such checkout.session: cs_test_invalid")),
    /sesión de Stripe/,
  );
});

test("fulfill events include async payment success", () => {
  assert.equal(FULFILL_EVENT_TYPES.has("checkout.session.completed"), true);
  assert.equal(FULFILL_EVENT_TYPES.has("checkout.session.async_payment_succeeded"), true);
});

function withTempBoard(fn) {
  const prevDir = process.env.DATA_DIR;
  const prevEmpty = process.env.EMPTY_BOARD;
  const prevKey = process.env.STRIPE_SECRET_KEY;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "podio-pay-"));
  process.env.DATA_DIR = dir;
  process.env.EMPTY_BOARD = "1";
  delete process.env.STRIPE_SECRET_KEY;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      fs.rmSync(dir, { recursive: true, force: true });
      if (prevDir == null) delete process.env.DATA_DIR;
      else process.env.DATA_DIR = prevDir;
      if (prevEmpty == null) delete process.env.EMPTY_BOARD;
      else process.env.EMPTY_BOARD = prevEmpty;
      if (prevKey == null) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = prevKey;
    });
}

test("confirmPaidSession does not write the board unless the session is paid", async () => {
  await withTempBoard(async () => {
    const unpaid = await confirmPaidSession("cs_unpaid", {
      id: "cs_unpaid",
      payment_status: "unpaid",
      status: "open",
      amount_total: 1500,
      currency: "usd",
      metadata: metadataFromPayload("c_unpaid", payload, 15),
    });
    assert.equal(unpaid.waiting, true);
    assert.equal(listBoard("all").length, 0);

    const mismatch = await confirmPaidSession("cs_mismatch", {
      id: "cs_mismatch",
      payment_status: "paid",
      amount_total: 500,
      currency: "usd",
      metadata: metadataFromPayload("c_mismatch", payload, 15),
    });
    assert.equal(mismatch.ok, false);
    assert.match(mismatch.error, /no coincide/);
    assert.equal(listBoard("all").length, 0);
  });
});

test("confirmPaidSession fulfills a paid session once", async () => {
  await withTempBoard(async () => {
    const session = {
      id: "cs_paid_once",
      payment_status: "paid",
      amount_total: 1500,
      currency: "usd",
      metadata: metadataFromPayload("c_paid", payload, 15),
    };
    const first = await confirmPaidSession("cs_paid_once", session);
    assert.equal(first.ok, true);
    assert.equal(first.rank, 1);
    const rows = listBoard("all");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].handle, "@lunavarela");
    assert.equal(rows[0].amount, 15);

    const second = await confirmPaidSession("cs_paid_once", session);
    assert.equal(second.ok, true);
    assert.equal(second.rank, 1);
    assert.equal(listBoard("all").length, 1);
    assert.equal(listBoard("all")[0].amount, 15);
  });
});
