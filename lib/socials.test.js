import assert from "node:assert/strict";
import { test } from "node:test";
import { SEED_CREATORS } from "./seed.js";
import {
  detectPlatform,
  listingSocials,
  normalizeSocialList,
  primarySocial,
  resolveOutboundUrl,
  socialCaption,
  socialHref,
} from "./socials.js";

test("detectPlatform reads the host, not the listing fallback", () => {
  assert.equal(detectPlatform("https://twitch.tv/ibai", "instagram"), "twitch");
  assert.equal(detectPlatform("https://tiktok.com/@lolalolita"), "tiktok");
  assert.equal(detectPlatform("https://youtube.com/@ibai"), "youtube");
  assert.equal(detectPlatform("https://www.instagram.com/rosalia"), "instagram");
  assert.equal(detectPlatform("https://kick.com/westcol"), "kick");
  assert.equal(detectPlatform("https://x.com/ibai"), "x");
  assert.equal(detectPlatform("https://talentandino.com", "instagram"), "web");
});

test("listingSocials always includes the primary url and optional extras", () => {
  const listing = {
    slug: "ibai",
    handle: "@ibai",
    platform: "twitch",
    url: "https://twitch.tv/ibai",
    socials: [
      { platform: "youtube", url: "https://youtube.com/@ibai" },
      { platform: "youtube", url: "https://youtube.com/@ibai/" },
      { url: "not-a-url" },
    ],
  };
  const socials = listingSocials(listing);
  assert.equal(socials.length, 2);
  assert.equal(socials[0].primary, true);
  assert.equal(socials[0].platform, "twitch");
  assert.equal(socials[0].url, "https://twitch.tv/ibai");
  assert.equal(socials[0].caption, "@ibai");
  assert.equal(socials[1].primary, false);
  assert.equal(socials[1].platform, "youtube");
  assert.equal(socials[1].url, "https://youtube.com/@ibai");
  assert.equal(socialHref(listing, socials[0]), "/go/ibai");
  assert.equal(socialHref(listing, socials[1]), "https://youtube.com/@ibai");
});

test("resolveOutboundUrl stays on known socials and ignores open redirects", () => {
  const listing = {
    slug: "ibai",
    handle: "@ibai",
    platform: "twitch",
    url: "https://twitch.tv/ibai",
    socials: [{ platform: "youtube", url: "https://youtube.com/@ibai" }],
  };
  assert.equal(resolveOutboundUrl(listing), "https://twitch.tv/ibai");
  assert.equal(resolveOutboundUrl(listing, "https://youtube.com/@ibai"), "https://youtube.com/@ibai");
  assert.equal(resolveOutboundUrl(listing, "https://evil.example/phish"), "https://twitch.tv/ibai");
  assert.equal(resolveOutboundUrl({ slug: "x" }, "https://evil.example"), "");
});

test("every seed creator with a url exposes at least the primary social", () => {
  let extras = 0;
  for (const c of SEED_CREATORS) {
    assert.ok(c.url, c.handle);
    const socials = listingSocials({
      slug: c.handle.replace(/^@/, "").toLowerCase(),
      handle: c.handle,
      platform: c.platform,
      url: c.url,
      socials: c.socials,
    });
    assert.ok(socials.length >= 1, c.handle);
    assert.equal(socials[0].url, c.url);
    assert.equal(primarySocial({ url: c.url, platform: c.platform, handle: c.handle }).url, c.url);
    extras += socials.length - 1;
  }
  assert.ok(extras >= 2, "a few obvious same-handle extras are allowed");
  assert.ok(extras < 20, "do not stuff every network");
});

test("normalizeSocialList drops junk and custom domains stay web", () => {
  assert.deepEqual(normalizeSocialList([{ url: "" }, { platform: "x" }]), []);
  const web = listingSocials({
    handle: "@talentandino",
    platform: "instagram",
    url: "https://talentandino.com",
  });
  assert.equal(web[0].platform, "web");
  assert.equal(socialCaption(web[0].url, "web"), "talentandino.com");
});
