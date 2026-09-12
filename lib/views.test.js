import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OFFICIAL_TIKTOK_HANDLE,
  OFFICIAL_TIKTOK_URL,
  aboutPage,
  categoryCards,
  compactSocialHtml,
  creatorSocialsHtml,
  faqPage,
  layout,
  officialSocials,
  podiumHtml,
  rankArticles,
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

const ibai = {
  slug: "ibai",
  handle: "@ibai",
  display_name: "Ibai",
  platform: "twitch",
  url: "https://twitch.tv/ibai",
  socials: [{ platform: "youtube", url: "https://youtube.com/@ibai" }],
  category_slug: "streaming",
  country: "ES",
  rank: 1,
  amount: 25000,
  love: 10,
  hate: 2,
};

test("creatorSocialsHtml renders Redes chips with tracked primary and direct extras", () => {
  const html = creatorSocialsHtml(ibai);
  assert.match(html, /<section class="redes"/);
  assert.match(html, /id="redes-title">Redes</);
  assert.match(html, /href="\/go\/ibai"/);
  assert.match(html, /href="https:\/\/youtube\.com\/@ibai"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, />Twitch</);
  assert.match(html, />@ibai</);
  assert.match(html, />YouTube</);
});

test("ranking podium and category cards expose a compact outbound social", () => {
  const rank = rankArticles([ibai]);
  assert.match(rank, /class="social-out"/);
  assert.match(rank, /href="\/go\/ibai"/);
  assert.match(rank, /target="_blank"/);
  assert.match(rank, /rel="noopener noreferrer"/);
  assert.match(rank, /aria-label="Abrir Twitch @ibai"/);

  const podium = podiumHtml([ibai]);
  assert.match(podium, /<article class="card p1">/);
  assert.match(podium, /href="\/creator\/ibai"/);
  assert.match(podium, /class="social-out podium-social"/);
  assert.doesNotMatch(podium, /<a class="card /);

  const cats = categoryCards([
    {
      slug: "streaming",
      name: "Streaming & Twitch",
      count: 1,
      leader: {
        slug: "ibai",
        handle: "@ibai",
        name: "Ibai",
        amount: 25000,
        url: "https://twitch.tv/ibai",
        platform: "twitch",
      },
    },
  ]);
  assert.match(cats, /<article class="cat-card">/);
  assert.match(cats, /class="social-out cat-social"/);
  assert.match(cats, /href="\/go\/ibai"/);
  assert.equal(compactSocialHtml({ slug: "x" }), "");
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
