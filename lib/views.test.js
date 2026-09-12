import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OFFICIAL_TIKTOK_HANDLE,
  OFFICIAL_TIKTOK_URL,
  officialSocials,
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
