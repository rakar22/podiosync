import assert from "node:assert/strict";
import test from "node:test";
import { consentAllowsAds, consentAllowsAnalytics, parseConsent, serializeConsent } from "./consent";

test("legacy consent values still parse", () => {
  assert.deepEqual(parseConsent("all"), { necessary: true, analytics: true, ads: true });
  assert.deepEqual(parseConsent("necessary"), { necessary: true, analytics: false, ads: false });
  assert.equal(parseConsent(""), null);
  assert.equal(parseConsent("nope"), null);
});

test("preferences serialize analytics and ads separately", () => {
  const value = serializeConsent({ analytics: true, ads: false });
  assert.equal(value, "v1.necessary.analytics");
  assert.equal(consentAllowsAnalytics(value), true);
  assert.equal(consentAllowsAds(value), false);
  assert.equal(consentAllowsAds(serializeConsent({ analytics: false, ads: true })), true);
});
