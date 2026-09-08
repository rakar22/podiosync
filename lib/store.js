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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "board.json");
const PENDING_PATH = path.join(__dirname, "..", "data", "pending.json");

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
  return state;
}

function load() {
  try {
    return hydrateSentiment(mergeSeed(JSON.parse(fs.readFileSync(DATA_PATH, "utf8"))));
  } catch {
    const state = emptyState();
    save(state);
    return hydrateSentiment(state);
  }
}

function save(state) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(state, null, 2));
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
    .reduce((s, p) => s + p.amount, 0);
}

export function listBoard(board = "all", category = null) {
  const state = load();
  let rows = state.listings.map((l) => ({
    ...l,
    love: Number(l.love) || 0,
    hate: Number(l.hate) || 0,
    window_amount: board === "love" || board === "hate" ? l.amount : windowAmount(state, l, board),
  }));
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
  const hour = new Date().getUTCHours();
  const tick = Math.floor(Date.now() / 60_000);
  return {
    visitors: state.visitors,
    launched_at: state.launched_at,
    revenue: state.listings.reduce((s, l) => s + l.amount, 0),
    listings: state.listings.length,
    online: 9 + (hour % 19) + (tick % 8),
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
          }
        : null,
    };
  });
}

export function quoteClaim(input) {
  const handle = normalizeHandle(input.handle);
  const displayName = String(input.displayName || "").trim();
  const category = String(input.category || "");
  const target = Math.round(Number(input.targetTotal));
  if (!handle || handle.length < 2) return { ok: false, error: "Pon un @handle o URL." };
  if (!displayName) return { ok: false, error: "Falta el nombre." };
  if (!CATEGORIES.some((c) => c.slug === category)) return { ok: false, error: "Categoría no válida." };
  if (!Number.isFinite(target) || target < MIN_NEW || target > MAX_BID) {
    return { ok: false, error: `El total debe estar entre $${MIN_NEW} y $${MAX_BID}.` };
  }
  const state = load();
  const current = state.listings.find((l) => l.handle.toLowerCase() === handle.toLowerCase());
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
      url: String(input.url || "").trim(),
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
  const current = state.listings.find((l) => l.handle.toLowerCase() === handle.toLowerCase());
  const ts = nowIso();
  let listing;
  if (current) {
    current.display_name = displayName;
    current.tagline = String(input.tagline || "").trim();
    current.description = String(input.description || "").trim();
    current.url = String(input.url || "").trim();
    current.platform = input.platform || current.platform;
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
      url: String(input.url || "").trim() || `https://instagram.com/${slug}`,
      platform: input.platform || "instagram",
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
  const db = loadPending();
  if (db.fulfilled[sessionId]) return db.fulfilled[sessionId].result;
  const result = claimRank(payload);
  if (result.ok) {
    db.fulfilled[sessionId] = { result, at: nowIso() };
    if (result.slug) {
      for (const [id, row] of Object.entries(db.pending)) {
        if (row?.payload?.handle?.toLowerCase() === payload.handle?.toLowerCase()) {
          delete db.pending[id];
        }
      }
    }
    savePendingMap(db);
  }
  return result;
}

function loadPending() {
  try {
    const raw = JSON.parse(fs.readFileSync(PENDING_PATH, "utf8"));
    if (raw && typeof raw === "object" && raw.pending && raw.fulfilled) return raw;
    return { pending: raw && typeof raw === "object" ? raw : {}, fulfilled: {} };
  } catch {
    return { pending: {}, fulfilled: {} };
  }
}

function savePendingMap(map) {
  fs.mkdirSync(path.dirname(PENDING_PATH), { recursive: true });
  fs.writeFileSync(PENDING_PATH, JSON.stringify(map, null, 2));
}
