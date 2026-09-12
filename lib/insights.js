/**
 * Derived, read-only signals from existing listing/payment fields.
 * Does not change ranking, claim math, votes, or Stripe.
 *
 * Polarización (documentada en UI):
 *   I = 100 × 2 × min(♥, ✕) / (♥ + ✕)
 *   0% = consenso (casi solo cariño o solo hate)
 *   100% = empate de votos (máxima polarización)
 *   null si no hay votos
 */

export function polarizationIndex(love, hate) {
  const hearts = Math.max(0, Number(love) || 0);
  const downs = Math.max(0, Number(hate) || 0);
  const total = hearts + downs;
  if (total <= 0) return null;
  return Math.round((200 * Math.min(hearts, downs)) / total);
}

export function polarizationLabel(index) {
  if (index == null) return null;
  if (index >= 70) return "Alta";
  if (index >= 40) return "Media";
  return "Baja";
}

export function parseRegion(raw) {
  const v = String(raw || "").toLowerCase();
  if (v === "es" || v === "espana" || v === "españa") return "es";
  if (v === "latam" || v === "lat") return "latam";
  return "all";
}

export function filterRegion(listings, region) {
  const r = parseRegion(region);
  if (r === "all" || !Array.isArray(listings)) return listings;
  const rows =
    r === "es"
      ? listings.filter((l) => String(l.country || "") === "ES")
      : listings.filter((l) => String(l.country || "") && String(l.country) !== "ES");
  return rows.map((l, i) => ({ ...l, rank: i + 1 }));
}

export function withPaid24h(listings, todayBoard) {
  const map = new Map((todayBoard || []).map((l) => [l.slug, Number(l.window_amount) || 0]));
  return (listings || []).map((l) => ({
    ...l,
    paid_24h: map.get(l.slug) || 0,
  }));
}

export function lastUpdatedIso(listings, extra = []) {
  let max = 0;
  for (const row of [...(listings || []), ...(extra || [])]) {
    const iso = row?.updated_at || row?.created_at;
    const t = iso ? new Date(iso).getTime() : 0;
    if (Number.isFinite(t) && t > max) max = t;
  }
  return max ? new Date(max).toISOString() : null;
}

export function deriveTrending({ all = [], today = [], newestDays = 14 } = {}) {
  const voted = [...all]
    .map((l) => ({ ...l, votes: (Number(l.love) || 0) + (Number(l.hate) || 0) }))
    .sort((a, b) => b.votes - a.votes || b.amount - a.amount);

  const rising = [...today]
    .filter((l) => (Number(l.window_amount) || 0) > 0)
    .sort((a, b) => (b.window_amount || 0) - (a.window_amount || 0));

  const cutoff = Date.now() - newestDays * 86_400_000;
  const newest = [...all]
    .filter((l) => {
      const t = new Date(l.created_at || 0).getTime();
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const polarized = [...all]
    .map((l) => ({ ...l, polar: polarizationIndex(l.love, l.hate) }))
    .filter((l) => l.polar != null && (Number(l.love) || 0) + (Number(l.hate) || 0) >= 20)
    .sort((a, b) => b.polar - a.polar || b.amount - a.amount);

  return {
    rising: rising.slice(0, 6),
    voted: voted.slice(0, 6),
    newest: newest.slice(0, 6),
    polarized: polarized.slice(0, 6),
  };
}

export function searchListings(listings, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (!q) return [];
  return (listings || []).filter((l) => {
    const name = String(l.display_name || "").toLowerCase();
    const handle = String(l.handle || "")
      .toLowerCase()
      .replace(/^@/, "");
    const slug = String(l.slug || "").toLowerCase();
    const tag = String(l.tagline || "").toLowerCase();
    const cat = String(l.category_slug || "").toLowerCase();
    return (
      name.includes(q) || handle.includes(q) || slug.includes(q) || tag.includes(q) || cat.includes(q)
    );
  });
}

export function creatorsIndex(listings) {
  return (listings || []).map((l) => ({
    s: l.slug,
    n: l.display_name,
    h: l.handle,
    c: l.category_slug,
    o: l.country,
  }));
}

export function paymentSeries(payments) {
  const sorted = [...(payments || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );
  let cum = 0;
  return sorted.map((p) => {
    cum += Number(p.amount) || 0;
    return { t: p.created_at, v: cum, delta: Number(p.amount) || 0 };
  });
}
