import { PLATFORM_MAP } from "./categories.js";

const PLATFORM_NAMES = {
  ...PLATFORM_MAP,
  web: "Web",
};

const HOST_PLATFORMS = [
  [/^(www\.)?instagram\.com$/i, "instagram"],
  [/^(www\.)?tiktok\.com$/i, "tiktok"],
  [/^(www\.)?(youtube\.com|youtu\.be)$/i, "youtube"],
  [/^(www\.)?twitch\.tv$/i, "twitch"],
  [/^(www\.)?kick\.com$/i, "kick"],
  [/^(www\.)?(x\.com|twitter\.com)$/i, "x"],
];

export function normalizeSocialUrl(raw) {
  const u = String(raw || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u.slice(0, 300);
  if (/^[\w.-]+\.[a-z]{2,}([/?#]|$)/i.test(u)) return `https://${u}`.slice(0, 300);
  return "";
}

export function detectPlatform(url, fallback = "") {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    for (const [re, id] of HOST_PLATFORMS) {
      if (re.test(host)) return id;
    }
    return "web";
  } catch {
    const fb = String(fallback || "").toLowerCase();
    if (fb && PLATFORM_NAMES[fb]) return fb;
    return "";
  }
}

export function platformLabel(id) {
  return PLATFORM_NAMES[id] || "Web";
}

function urlKey(url) {
  return String(url || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
}

export function sameSocialUrl(a, b) {
  return Boolean(a && b && urlKey(a) === urlKey(b));
}

export function socialCaption(url, platform, listingHandle = "") {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (platform === "web") return host;
    const last = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop() || "";
    const fromUrl = last.replace(/^@/, "");
    const fromListing = String(listingHandle || "")
      .replace(/^@+/, "")
      .trim();
    const handle = fromUrl || fromListing;
    return handle ? `@${handle}` : host;
  } catch {
    const handle = String(listingHandle || "").replace(/^@+/, "").trim();
    return handle ? `@${handle}` : "";
  }
}

export function normalizeSocialList(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const url = normalizeSocialUrl(item.url);
    if (!url) continue;
    const key = urlKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    const platform = detectPlatform(url, item.platform);
    out.push({ platform, url });
  }
  return out;
}

export function listingSocials(listing) {
  if (!listing || typeof listing !== "object") return [];
  const out = [];
  const seen = new Set();

  const push = (platformHint, rawUrl, primary = false) => {
    const url = normalizeSocialUrl(rawUrl);
    if (!url) return;
    const key = urlKey(url);
    if (seen.has(key)) return;
    seen.add(key);
    const platform = detectPlatform(url, platformHint || listing.platform);
    out.push({
      platform,
      url,
      primary,
      label: platformLabel(platform),
      caption: socialCaption(url, platform, listing.handle),
    });
  };

  push(listing.platform, listing.url, true);
  for (const extra of normalizeSocialList(listing.socials)) {
    push(extra.platform, extra.url, false);
  }
  return out;
}

export function primarySocial(listing) {
  return listingSocials(listing).find((s) => s.primary) || listingSocials(listing)[0] || null;
}

export function resolveOutboundUrl(listing, requested) {
  const socials = listingSocials(listing);
  if (!socials.length) return "";
  const want = normalizeSocialUrl(requested);
  if (want) {
    const match = socials.find((s) => sameSocialUrl(s.url, want));
    if (match) return match.url;
  }
  return socials.find((s) => s.primary)?.url || socials[0].url;
}

export function socialHref(listing, social) {
  if (!social?.url) return "";
  if (social.primary && listing?.slug) return `/go/${listing.slug}`;
  return social.url;
}

export function platformIcon(id, size = 16) {
  const s = Number(size) || 16;
  const icons = {
    instagram: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.05" fill="currentColor"/></svg>`,
    tiktok: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path fill="currentColor" d="M16.6 5.82c1.1 1.24 2.6 2.08 4.28 2.26v3.18a8.3 8.3 0 0 1-4.28-1.22v6.7a6.74 6.74 0 1 1-6.74-6.74c.3 0 .6.02.9.07v3.3a3.52 3.52 0 1 0 2.48 3.37V3.5h3.36c.1.78.3 1.53.6 2.32Z"/></svg>`,
    youtube: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><rect x="2.6" y="6.2" width="18.8" height="11.6" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="currentColor" d="M10.4 9.4v5.2L15.2 12z"/></svg>`,
    twitch: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path fill="currentColor" d="M5.2 3.5h13.6v9.4l-3.4 3.4h-3.4l-1.9 1.9H8.4v-1.9H5.2Zm1.9 1.7v8.5h3.2v1.9l1.9-1.9h3.5l2.3-2.3V5.2Zm3.2 2.1h1.7v3.8H10.3Zm3.8 0H15.8v3.8h-1.7Z"/></svg>`,
    kick: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path fill="currentColor" d="M6 4h5.2v5.1L14.8 5.5H19l-4.8 4.8L19 15.2h-4.2l-3.6-3.6V20H6Z"/></svg>`,
    x: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path fill="currentColor" d="M5 5.5h3.2l4.05 5.45L16.6 5.5H19l-5.55 7.15L19.2 18.5h-3.2l-4.3-5.75L7.4 18.5H5l5.85-7.5Z"/></svg>`,
    web: `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 12h14M12 5c2.4 2.2 3.6 4.6 3.6 7s-1.2 4.8-3.6 7c-2.4-2.2-3.6-4.6-3.6-7s1.2-4.8 3.6-7Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
  };
  return icons[id] || icons.web;
}
