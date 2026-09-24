import assert from "node:assert/strict";
import test from "node:test";
import { amountMatches, sessionIsPaid } from "./stripe";
import { cleanEnv } from "./slug";

test("paid sessions are recognized", () => {
  assert.equal(sessionIsPaid({ payment_status: "paid", status: "complete" }), true);
  assert.equal(sessionIsPaid({ payment_status: "unpaid", status: "complete" }), false);
  assert.equal(sessionIsPaid(null), false);
});

test("amounts must match the stored cents and currency", () => {
  assert.equal(amountMatches({ amount_total: 9900, currency: "eur" }, 9900, "eur"), true);
  assert.equal(amountMatches({ amount_total: 9800, currency: "eur" }, 9900, "eur"), false);
  assert.equal(amountMatches({ amount_total: 9900, currency: "usd" }, 9900, "eur"), false);
});

test("env values are trimmed without keeping wrapping quotes", () => {
  assert.equal(cleanEnv(' "sk_test_123" '), "sk_test_123");
  assert.equal(cleanEnv("bearer whsec_abc"), "whsec_abc");
});
