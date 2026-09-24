import assert from "node:assert/strict";
import test from "node:test";
import { daysLeft, renewalSentence } from "./money";
import { validatePricingInput } from "./positions";
import { legalIdentity, siteName } from "./site";

test("renewal copy names the position and the remaining days", () => {
  assert.equal(renewalSentence("es", "Posición #1", 12), "Tu posición #1 termina en 12 días.");
  assert.equal(renewalSentence("en", "Position #1", 3), "Your position #1 ends in 3 days.");
});

test("days left rounds up partial days", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const end = new Date("2026-01-02T01:00:00Z");
  assert.equal(daysLeft(end, now), 2);
  assert.equal(daysLeft(null, now), null);
});

test("pricing input rejects a city without a country and absurd amounts", () => {
  assert.equal(validatePricingInput({ position: "RANK_1", priceCents: 9900, durationDays: 30, currency: "eur", cityId: "madrid", countryId: null }), "CITY");
  assert.equal(validatePricingInput({ position: "RANK_1", priceCents: 50, durationDays: 30, currency: "eur" }), "PRICE");
  assert.equal(validatePricingInput({ position: "RANK_1", priceCents: 9900, durationDays: 30, currency: "euro" }), "CURRENCY");
  assert.equal(validatePricingInput({ position: "RANK_1", priceCents: 9900, durationDays: 30, currency: "eur" }), null);
});

test("legal identity is pending until name, tax id, and address exist", () => {
  const snapshot = {
    LEGAL_ENTITY_NAME: process.env.LEGAL_ENTITY_NAME,
    LEGAL_TAX_ID: process.env.LEGAL_TAX_ID,
    LEGAL_ADDRESS: process.env.LEGAL_ADDRESS,
    LEGAL_EMAIL: process.env.LEGAL_EMAIL,
    CONTACT_EMAIL: process.env.CONTACT_EMAIL,
    SITE_NAME: process.env.SITE_NAME,
  };
  try {
    delete process.env.LEGAL_ENTITY_NAME;
    delete process.env.LEGAL_TAX_ID;
    delete process.env.LEGAL_ADDRESS;
    delete process.env.LEGAL_EMAIL;
    delete process.env.CONTACT_EMAIL;
    delete process.env.SITE_NAME;
    const empty = legalIdentity();
    assert.equal(empty.configured, false);
    assert.equal(empty.name, "");
    assert.equal(empty.taxId, "");
    assert.equal(empty.address, "");
    assert.equal(empty.email, "podio@podiosync.es");
    assert.equal(siteName(), "TECHPODIO");
    process.env.LEGAL_ENTITY_NAME = "Entidad de prueba";
    process.env.LEGAL_TAX_ID = "B00000000";
    process.env.LEGAL_ADDRESS = "Calle de prueba 1";
    assert.equal(legalIdentity().configured, true);
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
