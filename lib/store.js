import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_CREATORS } from "./seed.js";
import {
  CATEGORIES,
  MIN_NEW,
  MAX_BID,
  TAKE_FIRST_DELTA,
  TAKE_OTHER_DELTA,
} from "./categories.js";
import { normalizeSocialList } from "./socials.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function dataPaths() {
  const dir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
  return {
    board: path.join(dir, "board.json"),
    pending: path.join(dir, "pending.json"),
  };
}

export function formatUsd(n) {
  const v = Number(n);
  const safe = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe);
}

export function asMoney(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export function parseUsdInput(raw) {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (!digits) return NaN;
  const n = Number(digits);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeUrl(raw) {
  const u = String(raw || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u.slice(0, 300);
  if (/^[\w.-]+\.[a-z]{2,}([/?#]|$)/i.test(u)) return `https://${u}`.slice(0, 300);
  return u.slice(0, 300);
}

function slugFromHandle(handle) {
  return String(handle)
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function normalizeHandle(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("@")) return `@${trimmed.slice(1).replace(/^@+/, "")}`;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");
    const last = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
    if (last && /instagram|tiktok|youtube|twitch|x\.com|twitter|kick/.test(host)) {
      return `@${last.replace(/^@/, "")}`;
    }
    return host + (url.pathname.replace(/\/+$/, "") || "");
  } catch {
    return `@${trimmed.replace(/\s+/g, "").replace(/^@+/, "")}`;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function stripeIsLive() {
  let k = String(process.env.STRIPE_SECRET_KEY ?? "")
    .replace(/^\uFEFF/, "")
    .trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  return k.startsWith("sk_live_") || k.startsWith("rk_live_");
}

function stampLaunchedAt(state) {
  if (state.launched_at) return false;
  if (!stripeIsLive()) return false;
  state.launched_at = nowIso();
  return true;
}

function emptyState() {
  if (process.env.EMPTY_BOARD === "1" || process.env.EMPTY_BOARD === "true") {
    return {
      visitors: 0,
      launched_at: nowIso(),
      nextIds: { listing: 1, payment: 1, activity: 1 },
      listings: [],
      payments: [],
      activity: [],
    };
  }
  const launched = "2026-08-20T23:08:00.000Z";
  const listings = [];
  const payments = [];
  const activity = [];
  let id = 1;
  let payId = 1;
  let actId = 1;
  for (const c of SEED_CREATORS) {
    const created = new Date(Date.now() - c.daysAgo * 86_400_000).toISOString();
    const base = c.amount - c.raises.reduce((s, r) => s + r.extra, 0);
    const listing = {
      id: id++,
      slug: slugFromHandle(c.handle),
      handle: c.handle,
      display_name: c.name,
      tagline: c.tagline,
      description: c.description,
      url: c.url,
      platform: c.platform,
      socials: normalizeSocialList(c.socials),
      country: c.country,
      category_slug: c.category,
      amount: c.amount,
      clicks: c.clicks,
      created_at: created,
      updated_at: created,
      ...seedLoveHate({ slug: slugFromHandle(c.handle), clicks: c.clicks }),
    };
    listings.push(listing);
    const firstPaid = new Date(new Date(created).getTime() + 5 * 60_000).toISOString();
    payments.push({ id: payId++, listing_id: listing.id, amount: base, created_at: firstPaid });
    activity.push({
      id: actId++,
      listing_id: listing.id,
      kind: "claim",
      amount: base,
      rank: null,
      created_at: firstPaid,
    });
    for (const raise of c.raises) {
      const when = new Date(Date.now() - raise.hoursAgo * 3_600_000).toISOString();
      payments.push({ id: payId++, listing_id: listing.id, amount: raise.extra, created_at: when });
      activity.push({
        id: actId++,
        listing_id: listing.id,
        kind: "raise",
        amount: raise.extra,
        rank: null,
        created_at: when,
      });
    }
  }
  return {
    visitors: 184291,
    launched_at: launched,
    nextIds: { listing: id, payment: payId, activity: actId },
    listings,
    payments,
    activity,
  };
}

function mergeSeed(state) {
  if (process.env.EMPTY_BOARD === "1" || process.env.EMPTY_BOARD === "true") {
    return state;
  }
  const have = new Set(state.listings.map((l) => l.slug));
  let id = state.nextIds?.listing ?? state.listings.length + 1;
  let payId = state.nextIds?.payment ?? state.payments.length + 1;
  let actId = state.nextIds?.activity ?? state.activity.length + 1;
  let added = 0;
  for (const c of SEED_CREATORS) {
    const slug = slugFromHandle(c.handle);
    if (have.has(slug)) continue;
    const created = new Date(Date.now() - c.daysAgo * 86_400_000).toISOString();
    const base = c.amount - c.raises.reduce((s, r) => s + r.extra, 0);
    const listing = {
      id: id++,
      slug,
      handle: c.handle,
      display_name: c.name,
      tagline: c.tagline,
      description: c.description,
      url: c.url,
      platform: c.platform,
      socials: normalizeSocialList(c.socials),
      country: c.country,
      category_slug: c.category,
      amount: c.amount,
      clicks: c.clicks,
      created_at: created,
      updated_at: created,
      ...seedLoveHate({ slug: slugFromHandle(c.handle), clicks: c.clicks }),
    };
    state.listings.push(listing);
    have.add(slug);
    added += 1;
    const firstPaid = new Date(new Date(created).getTime() + 5 * 60_000).toISOString();
    state.payments.push({ id: payId++, listing_id: listing.id, amount: base, created_at: firstPaid });
    state.activity.push({
      id: actId++,
      listing_id: listing.id,
      kind: "claim",
      amount: base,
      rank: null,
      created_at: firstPaid,
    });
    for (const raise of c.raises) {
      const when = new Date(Date.now() - raise.hoursAgo * 3_600_000).toISOString();
      state.payments.push({ id: payId++, listing_id: listing.id, amount: raise.extra, created_at: when });
      state.activity.push({
        id: actId++,
        listing_id: listing.id,
        kind: "raise",
        amount: raise.extra,
        rank: null,
        created_at: when,
      });
    }
  }
  state.nextIds = { listing: id, payment: payId, activity: actId };
  if (added) save(state);
  return state;
}

function polarSlugs() {
  return new Set([
    "elxokas",
    "westcol",
    "naimdarrechi",
    "ampeterby7",
    "alofoke",
    "davooxeneize",
    "juandediospantoja",
    "lacobraaa",
    "mrstiven",
    "nexxuz",
    "zonagemelos",
    "badabun",
    "kimberlyloaiza",
    "yosoyplex",
  ]);
}

export function seedLoveHate(listing) {
  const clicks = Number(listing.clicks) || 800;
  const love = Math.max(28, Math.round(clicks / 65));
  const polar = polarSlugs().has(listing.slug);
  const hate = polar
    ? Math.max(40, Math.round(love * 0.52))
    : Math.max(4, Math.round(love * 0.11));
  return { love, hate };
}

function hydrateSentiment(state) {
  let dirty = false;
  if (!state.votes) {
    state.votes = {};
    dirty = true;
  }
  for (const l of state.listings) {
    if (typeof l.love !== "number" || typeof l.hate !== "number") {
      const s = seedLoveHate(l);
      if (typeof l.love !== "number") l.love = s.love;
      if (typeof l.hate !== "number") l.hate = s.hate;
      dirty = true;
    }
  }
  if (dirty) save(state);
  return hydrateSocials(state);
}

function hydrateSocials(state) {
  const bySlug = new Map(
    SEED_CREATORS.map((c) => [slugFromHandle(c.handle), normalizeSocialList(c.socials)]),
  );
  let dirty = false;
  for (const l of state.listings) {
    if (!l || typeof l !== "object") continue;
    const extras = bySlug.get(l.slug) || [];
    const current = normalizeSocialList(l.socials);
    if (!current.length && extras.length) {
      l.socials = extras;
      dirty = true;
    } else if (Array.isArray(l.socials)) {
      const next = normalizeSocialList(l.socials);
      if (JSON.stringify(next) !== JSON.stringify(l.socials)) {
        l.socials = next;
        dirty = true;
      }
    }
  }
  if (dirty) save(state);
  return state;
}

function normalizeState(raw) {
  const state = raw && typeof raw === "object" ? raw : {};
  if (!Array.isArray(state.listings)) state.listings = [];
  if (!Array.isArray(state.payments)) state.payments = [];
  if (!Array.isArray(state.activity)) state.activity = [];
  if (!state.votes || typeof state.votes !== "object") state.votes = {};
  if (typeof state.visitors !== "number" || !Number.isFinite(state.visitors)) state.visitors = 0;
  if (!state.nextIds || typeof state.nextIds !== "object") {
    state.nextIds = {
      listing: 1,
      payment: 1,
      activity: 1,
    };
  }
  for (const key of ["listing", "payment", "activity"]) {
    const n = Number(state.nextIds[key]);
    state.nextIds[key] = Number.isFinite(n) && n > 0 ? n : 1;
  }
  for (const l of state.listings) {
    if (!l || typeof l !== "object") continue;
    l.amount = asMoney(l.amount);
    l.clicks = asMoney(l.clicks);
    l.handle = String(l.handle || "");
    l.display_name = String(l.display_name || l.handle || "Creator");
    l.slug = String(l.slug || slugFromHandle(l.handle) || `creator-${l.id || "x"}`);
    l.category_slug = String(l.category_slug || "");
    if (Array.isArray(l.socials)) l.socials = normalizeSocialList(l.socials);
  }
  state.listings = state.listings.filter((l) => l && typeof l === "object");
  return state;
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(dataPaths().board, "utf8"));
    const state = hydrateSentiment(mergeSeed(normalizeState(raw)));
    if (stampLaunchedAt(state)) save(state);
    return state;
  } catch {
    const state = emptyState();
    stampLaunchedAt(state);
    save(state);
    return hydrateSentiment(state);
  }
}

function save(state) {
  const file = dataPaths().board;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export function claimPriceFor(current, isFirst) {
  if (!current) return MIN_NEW;
  return current + (isFirst ? TAKE_FIRST_DELTA : TAKE_OTHER_DELTA);
}

function windowAmount(state, listing, board) {
  if (board === "all") return listing.amount;
  const since =
    board === "today"
      ? Date.now() - 86_400_000
      : Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
        );
  return state.payments
    .filter((p) => p.listing_id === listing.id && new Date(p.created_at).getTime() >= since)
    .reduce((s, p) => s + asMoney(p.amount), 0);
}

export function listBoard(board = "all", category = null) {
  const state = load();
  let rows = state.listings.map((l) => {
    const amount = asMoney(l.amount);
    const window =
      board === "love" || board === "hate" ? amount : asMoney(windowAmount(state, l, board));
    return {
      ...l,
      amount,
      love: asMoney(l.love),
      hate: asMoney(l.hate),
      window_amount: window,
    };
  });
  if (category) rows = rows.filter((r) => r.category_slug === category);
  if (board === "love") {
    rows.sort((a, b) => b.love - a.love || b.amount - a.amount);
  } else if (board === "hate") {
    rows.sort((a, b) => b.hate - a.hate || b.amount - a.amount);
  } else {
    if (board !== "all") rows = rows.filter((r) => r.window_amount > 0);
    rows.sort(
      (a, b) =>
        b.window_amount - a.window_amount || new Date(a.created_at) - new Date(b.created_at),
    );
  }
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function listActivity(limit = 20) {
  const state = load();
  const byId = Object.fromEntries(state.listings.map((l) => [l.id, l]));
  return [...state.activity]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map((a) => ({
      ...a,
      handle: byId[a.listing_id]?.handle,
      display_name: byId[a.listing_id]?.display_name,
      slug: byId[a.listing_id]?.slug,
    }));
}

export function getListing(slug) {
  const state = load();
  const listing = state.listings.find((l) => l.slug === slug);
  if (!listing) return null;
  const ranked = listBoard("all");
  const row = ranked.find((r) => r.slug === slug);
  const payments = state.payments
    .filter((p) => p.listing_id === listing.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return { listing: row, payments };
}

export function getStats() {
  const state = load();
  return {
    visitors: state.visitors,
    launched_at: state.launched_at,
    revenue: state.listings.reduce((s, l) => s + asMoney(l.amount), 0),
    listings: state.listings.length,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
  };
}

export function bumpVisitor() {
  const state = load();
  state.visitors += 1;
  save(state);
}

export function registerClick(slug) {
  const state = load();
  const l = state.listings.find((x) => x.slug === slug);
  if (l) {
    l.clicks += 1;
    save(state);
  }
}

export function categorySummaries() {
  const ranked = listBoard("all");
  return CATEGORIES.map((c) => {
    const inCat = ranked.filter((r) => r.category_slug === c.slug);
    const leader = inCat[0] || null;
    return {
      ...c,
      count: inCat.length,
      leader: leader
        ? {
            slug: leader.slug,
            handle: leader.handle,
            name: leader.display_name,
            tagline: leader.tagline,
            amount: leader.amount,
            url: leader.url,
            platform: leader.platform,
            socials: normalizeSocialList(leader.socials),
          }
        : null,
    };
  });
}

export function quoteClaim(input) {
  const handle = normalizeHandle(input.handle);
  const displayName = String(input.displayName || "").trim().slice(0, 80);
  const category = String(input.category || "").trim();
  const rawTarget = input.targetTotal;
  const numericTarget = Number(rawTarget);
  const target = Math.round(numericTarget);
  if (!handle || handle.length < 2) return { ok: false, error: "Pon un @handle o URL." };
  if (handle.startsWith("@") && handle.length < 3) return { ok: false, error: "Pon un @handle o URL." };
  if (!displayName) return { ok: false, error: "Falta el nombre." };
  if (!CATEGORIES.some((c) => c.slug === category)) return { ok: false, error: "Categoría no válida." };
  if (rawTarget === "" || rawTarget == null || !Number.isFinite(numericTarget)) {
    return { ok: false, error: "Pon un monto válido en USD." };
  }
  if (!Number.isInteger(numericTarget) && String(rawTarget).includes(".")) {
    return { ok: false, error: "El total tiene que ser un número entero en USD." };
  }
  if (!Number.isFinite(target) || target < MIN_NEW || target > MAX_BID) {
    return { ok: false, error: `El total debe estar entre $${MIN_NEW} y $${MAX_BID}.` };
  }
  const state = load();
  const current = state.listings.find(
    (l) => String(l.handle || "").toLowerCase() === handle.toLowerCase(),
  );
  const currentAmount = current?.amount ?? 0;
  const charged = target - currentAmount;
  if (charged < 1) {
    return {
      ok: false,
      error: current
        ? `Para subir, el nuevo total tiene que ser al menos $${currentAmount + 1}.`
        : `El mínimo para entrar es $${MIN_NEW}.`,
    };
  }
  const firstAmount = Math.max(0, ...state.listings.map((l) => l.amount));
  if (target > firstAmount && target < firstAmount + TAKE_FIRST_DELTA && currentAmount < firstAmount) {
    return { ok: false, error: `Para quitar el #1 hay que pagar al menos $${firstAmount + TAKE_FIRST_DELTA}.` };
  }
  return {
    ok: true,
    charged,
    currentAmount,
    target,
    payload: {
      handle,
      displayName,
      tagline: String(input.tagline || "").trim(),
      description: String(input.description || "").trim(),
      url: normalizeUrl(input.url),
      platform: input.platform || "instagram",
      country: input.country || "ES",
      category,
      targetTotal: target,
    },
  };
}

export function claimRank(input) {
  const quoted = quoteClaim(input);
  if (!quoted.ok) return quoted;
  const payload = quoted.payload;
  const handle = payload.handle;
  const displayName = payload.displayName;
  const category = payload.category;
  const target = payload.targetTotal;
  const charged = quoted.charged;

  const state = load();
  const current = state.listings.find(
    (l) => String(l.handle || "").toLowerCase() === handle.toLowerCase(),
  );
  const ts = nowIso();
  let listing;
  if (current) {
    current.display_name = displayName;
    current.tagline = String(input.tagline || "").trim();
    current.description = String(input.description || "").trim();
    current.url = normalizeUrl(input.url);
    current.platform = input.platform || current.platform;
    if (Array.isArray(input.socials)) current.socials = normalizeSocialList(input.socials);
    current.country = input.country || current.country;
    current.category_slug = category;
    current.amount = target;
    current.updated_at = ts;
    listing = current;
  } else {
    let slug = slugFromHandle(handle) || `creator-${Date.now()}`;
    let n = 2;
    while (state.listings.some((l) => l.slug === slug)) slug = `${slugFromHandle(handle)}-${n++}`;
    listing = {
      id: state.nextIds.listing++,
      slug,
      handle,
      display_name: displayName,
      tagline: String(input.tagline || "").trim(),
      description: String(input.description || "").trim(),
      url: normalizeUrl(input.url) || `https://instagram.com/${slug}`,
      platform: input.platform || "instagram",
      socials: normalizeSocialList(input.socials),
      country: input.country || "ES",
      category_slug: category,
      amount: target,
      clicks: 0,
      love: 0,
      hate: 0,
      created_at: ts,
      updated_at: ts,
    };
    state.listings.push(listing);
  }
  state.payments.push({
    id: state.nextIds.payment++,
    listing_id: listing.id,
    amount: charged,
    created_at: ts,
  });
  const ranked = [...state.listings].sort(
    (a, b) => b.amount - a.amount || new Date(a.created_at) - new Date(b.created_at),
  );
  const rank = ranked.findIndex((l) => l.id === listing.id) + 1;
  state.activity.push({
    id: state.nextIds.activity++,
    listing_id: listing.id,
    kind: current ? "raise" : "claim",
    amount: charged,
    rank,
    created_at: ts,
  });
  save(state);
  return { ok: true, slug: listing.slug, rank, charged, total: target };
}

export function voteOn(slug, kind, voterKey) {
  if (kind !== "love" && kind !== "hate") return { ok: false, error: "Voto no válido." };
  const key = String(voterKey || "").slice(0, 80);
  if (!key) return { ok: false, error: "Falta votante." };
  const state = load();
  const listing = state.listings.find((l) => l.slug === slug);
  if (!listing) return { ok: false, error: "No está en el ranking." };
  if (typeof listing.love !== "number") listing.love = 0;
  if (typeof listing.hate !== "number") listing.hate = 0;
  if (!state.votes) state.votes = {};
  const voteKey = `${key}:${slug}`;
  const prev = state.votes[voteKey];
  if (prev === kind) {
    return { ok: true, same: true, listing };
  }
  if (prev === "love") listing.love = Math.max(0, listing.love - 1);
  if (prev === "hate") listing.hate = Math.max(0, listing.hate - 1);
  if (kind === "love") listing.love += 1;
  else listing.hate += 1;
  state.votes[voteKey] = kind;
  save(state);
  return { ok: true, listing, kind };
}

export function putPending(id, payload, extra = {}) {
  const db = loadPending();
  db.pending[id] = { payload, created_at: nowIso(), ...extra };
  savePendingMap(db);
}

export function getPending(id) {
  const db = loadPending();
  return db.pending[id]?.payload || null;
}

export function getPendingRow(id) {
  if (!id) return null;
  const db = loadPending();
  return db.pending[id] || null;
}

export function takePending(id) {
  const db = loadPending();
  const row = db.pending[id];
  if (!row) return null;
  delete db.pending[id];
  savePendingMap(db);
  return row.payload;
}

export function fulfillPaid(sessionId, payload) {
  if (!sessionId) return { ok: false, error: "Sesión de pago inválida." };
  if (!payload || typeof payload !== "object") return { ok: false, error: "Falta la ficha de la reclamación." };
  const db = loadPending();
  const existing = db.fulfilled[sessionId];
  if (existing?.result) return existing.result;
  if (existing?.pending) return { ok: false, waiting: true };
  db.fulfilled[sessionId] = { pending: true, at: nowIso() };
  savePendingMap(db);
  try {
    const result = claimRank(payload);
    const next = loadPending();
    if (result.ok) {
      next.fulfilled[sessionId] = { result, at: nowIso() };
      if (result.slug) {
        const handle = String(payload.handle || "").toLowerCase();
        for (const [id, row] of Object.entries(next.pending)) {
          if (String(row?.payload?.handle || "").toLowerCase() === handle) {
            delete next.pending[id];
          }
        }
      }
      savePendingMap(next);
    } else {
      delete next.fulfilled[sessionId];
      savePendingMap(next);
    }
    return result;
  } catch (err) {
    const next = loadPending();
    delete next.fulfilled[sessionId];
    savePendingMap(next);
    throw err;
  }
}

function loadPending() {
  try {
    const raw = JSON.parse(fs.readFileSync(dataPaths().pending, "utf8"));
    if (raw && typeof raw === "object" && raw.pending && raw.fulfilled) return raw;
    return { pending: raw && typeof raw === "object" ? raw : {}, fulfilled: {} };
  } catch {
    return { pending: {}, fulfilled: {} };
  }
}

function savePendingMap(map) {
  const file = dataPaths().pending;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(map, null, 2));
}
