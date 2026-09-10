import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import {
  amountMatches,
  invoiceDescription,
  invoiceIsPaid,
  payloadFromInvoice,
  payloadFromMetadata,
  metadataFromPayload,
  parseWebhook,
  usdAmount,
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

test("usdAmount formats dollars for Strike", () => {
  assert.equal(usdAmount(10), "10.00");
  assert.equal(usdAmount("5"), "5.00");
  assert.throws(() => usdAmount(0));
});

test("invoice description round-trips claim metadata", () => {
  const description = invoiceDescription(payload, 10);
  assert.ok(description.length <= 200);
  assert.match(description, /podiosync/);
  const restored = payloadFromInvoice({ description });
  assert.equal(restored.handle, payload.handle);
  assert.equal(restored.displayName, payload.displayName);
  assert.equal(restored.targetTotal, 15);
  assert.equal(restored.category, "belleza");
});

test("invoice description stays within Strike's 200-char limit", () => {
  const long = {
    ...payload,
    handle: "@" + "x".repeat(80),
    displayName: "N".repeat(80),
    tagline: "t".repeat(80),
    description: "d".repeat(400),
    url: "https://example.com/" + "u".repeat(200),
    category: "c".repeat(40),
    targetTotal: 999999,
  };
  const description = invoiceDescription(long, 999999);
  assert.ok(description.length <= 200);
  const restored = payloadFromInvoice({ description });
  assert.ok(restored?.handle);
  assert.ok(restored?.displayName);
});

test("metadataFromPayload still restores a claim", () => {
  const meta = metadataFromPayload("claim-1", payload, 10);
  const restored = payloadFromMetadata(meta);
  assert.equal(restored.handle, "@lunavarela");
  assert.equal(restored.targetTotal, 15);
});

test("invoiceIsPaid only accepts PAID", () => {
  assert.equal(invoiceIsPaid({ state: "PAID" }), true);
  assert.equal(invoiceIsPaid({ state: "UNPAID" }), false);
  assert.equal(invoiceIsPaid({ state: "PENDING" }), false);
  assert.equal(invoiceIsPaid({ state: "CANCELLED" }), false);
});

test("amountMatches requires the charged USD total", () => {
  const invoice = { amount: { amount: "10.00", currency: "USD" } };
  assert.equal(amountMatches(invoice, 10), true);
  assert.equal(amountMatches(invoice, 15), false);
  assert.equal(amountMatches({ amount: { amount: "10.00", currency: "EUR" } }, 10), false);
});

test("parseWebhook verifies HMAC-SHA256 of the raw body", () => {
  const previous = process.env.STRIKE_WEBHOOK_SECRET;
  process.env.STRIKE_WEBHOOK_SECRET = "supersecret12";
  const body = Buffer.from(
    JSON.stringify({
      id: "evt-1",
      eventType: "invoice.updated",
      data: { entityId: "inv-1", changes: ["state"] },
    }),
    "utf8",
  );
  const sig = crypto.createHmac("sha256", "supersecret12").update(body).digest("hex");
  const event = parseWebhook(body, sig);
  assert.equal(event.eventType, "invoice.updated");
  assert.equal(event.data.entityId, "inv-1");
  assert.throws(() => parseWebhook(body, "deadbeef"));
  if (previous == null) delete process.env.STRIKE_WEBHOOK_SECRET;
  else process.env.STRIKE_WEBHOOK_SECRET = previous;
});
