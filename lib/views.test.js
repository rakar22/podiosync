import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OFFICIAL_TIKTOK_HANDLE,
  OFFICIAL_TIKTOK_URL,
  aboutPage,
  faqPage,
  layout,
  officialSocials,
  rulesPage,
  trustSection,
} from "./views.js";

test("officialSocials exposes only the official TikTok profile", () => {
  const html = officialSocials();
  assert.equal(OFFICIAL_TIKTOK_HANDLE, "@podiosync");
  assert.equal(OFFICIAL_TIKTOK_URL, "https://www.tiktok.com/@podiosync");
  assert.match(html, /href="https:\/\/www\.tiktok\.com\/@podiosync"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /aria-label="TikTok oficial de PodioSync, @podiosync"/);
  assert.match(html, />@podiosync</);
  assert.doesNotMatch(html, /instagram\.com|x\.com|twitter\.com/i);
});

function launchCopy() {
  return [trustSection(), aboutPage({ revenue: 1200, listings: 12, visitors: 40 }), faqPage(), rulesPage()].join(
    "\n",
  );
}

test("footer shows only real counters", () => {
  const html = layout({
    title: "Ranking",
    stats: { listings: 12, visitors: 40, launched_at: "2026-09-12T00:00:00.000Z" },
    body: "<p>ok</p>",
  });
  assert.match(html, />12<\/b>creadores/);
  assert.match(html, />40<\/b>visitas/);
  assert.doesNotMatch(html, /online ahora/i);
  assert.doesNotMatch(html, /stats\.online/);
});

test("launch copy is production Spanish without demo framing", () => {
  const html = launchCopy();
  assert.doesNotMatch(html, /demostraci[oó]n/i);
  assert.doesNotMatch(html, /fichas de demostraci[oó]n/i);
  assert.doesNotMatch(html, /modo demo/i);
  assert.match(html, /Stripe Checkout/);
  assert.match(html, /voto por persona/);
  assert.match(aboutPage({ revenue: 1, listings: 1, visitors: 1 }), /tiktok\.com\/@podiosync/i);
  assert.match(rulesPage(), /Stripe Checkout/);
});
