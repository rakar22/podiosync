import assert from "node:assert/strict";
import test from "node:test";
import { resolvePrice, slotAvailability, type PriceCandidate, type SlotView } from "./positions";

const rules: PriceCandidate[] = [
  { position: "RANK_1", categoryId: null, countryId: null, cityId: null, durationDays: 30, priceCents: 9900, currency: "eur", active: true },
  { position: "RANK_1", categoryId: "ai", countryId: "es", cityId: null, durationDays: 30, priceCents: 12900, currency: "eur", active: true },
  { position: "RANK_1", categoryId: "ai", countryId: "es", cityId: "madrid", durationDays: 30, priceCents: 14900, currency: "eur", active: true },
  { position: "RANK_1", categoryId: null, countryId: null, cityId: null, durationDays: 7, priceCents: 3500, currency: "eur", active: false },
];

test("more specific pricing rule wins", () => {
  const price = resolvePrice(rules, { position: "RANK_1", categoryId: "ai", countryId: "es", cityId: "madrid", durationDays: 30 });
  assert.equal(price?.priceCents, 14900);
});

test("country rule beats the base price", () => {
  const price = resolvePrice(rules, { position: "RANK_1", categoryId: "ai", countryId: "es", cityId: null, durationDays: 30 });
  assert.equal(price?.priceCents, 12900);
});

test("inactive rules are ignored", () => {
  const price = resolvePrice(rules, { position: "RANK_1", categoryId: null, countryId: null, cityId: null, durationDays: 7 });
  assert.equal(price, null);
});

test("an active slot blocks the position", () => {
  const slots: SlotView[] = [
    { id: "1", status: "ACTIVE", companyId: "c", endDate: new Date("2030-01-01"), holdUntil: null },
  ];
  assert.equal(slotAvailability(slots, new Date("2026-01-01")).available, false);
});

test("expired holds do not block", () => {
  const slots: SlotView[] = [
    { id: "1", status: "PENDING_PAYMENT", companyId: "c", endDate: null, holdUntil: new Date("2020-01-01") },
  ];
  assert.equal(slotAvailability(slots, new Date("2026-01-01")).available, true);
});
