import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORIES,
  CATEGORY_MAP,
  COUNTRIES,
  COUNTRY_MAP,
  PLATFORMS,
  PLATFORM_MAP,
} from "./lib/categories.js";
import {
  listBoard,
  listActivity,
  getListing,
  getStats,
  bumpVisitor,
  registerClick,
  categorySummaries,
  claimRank,
  claimPriceFor,
  putPending,
  getPending,
  fulfillPaid,
  quoteClaim,
  voteOn,
} from "./lib/store.js";
import {
  stripeEnabled,
  stripeMode,
  originFrom,
  createCheckout,
  retrieveSession,
  parseWebhook,
  payloadFromMetadata,
  sessionIsPaid,
} from "./lib/payments.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const STRIPE_WH = process.env.STRIPE_WEBHOOK_SECRET || "";

const app = express();

app.set("trust proxy", true);
app.get("/favicon.svg", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "favicon.svg"));
});
app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    stripe: stripeMode(),
    webhook: Boolean(STRIPE_WH),
  }),
);
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripeEnabled()) return res.status(400).json({ error: "Stripe no configurado" });
    if (!STRIPE_WH) return res.status(400).json({ error: "Falta STRIPE_WEBHOOK_SECRET" });
    try {
      const event = parseWebhook(req.body, req.headers["stripe-signature"]);
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const claimId = session.client_reference_id;
        const payload = getPending(claimId) || payloadFromMetadata(session.metadata);
        if (payload && sessionIsPaid(session)) {
          fulfillPaid(session.id, payload);
        }
      }
      res.json({ received: true });
    } catch (err) {
      res.status(400).send(`Webhook error: ${err.message}`);
    }
  },
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((req, res, next) => {
  const cookie = String(req.headers.cookie || "");
  const found = cookie.match(/(?:^|;\s*)psvid=([^;]+)/);
  req.voter = found ? decodeURIComponent(found[1]) : "";
  if (!req.voter) {
    req.voter = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    res.append("Set-Cookie", `psvid=${encodeURIComponent(req.voter)}; Path=/; Max-Age=31536000; SameSite=Lax`);
  }
  next();
});

function stripeBadge() {
  const m = stripeMode();
  if (m === "live") return "Stripe · pagos reales";
  if (m === "test") return "Stripe test";
  if (m === "on") return "Stripe";
  return "modo demo";
}
function money(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}
function num(n) {
  return new Intl.NumberFormat("es-ES").format(Number(n) || 0);
}
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}
function ago(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

function compact(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")} M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1).replace(".0", "")} mil`;
  return num(v);
}

function layout({ title, stats, body, flash, nav = "rank" }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(title)} · PodioSync</title>
  <meta name="description" content="El ranking público de influencers de España y Latinoamérica. Paga para subir. Vota a los más queridos y a los que más hate tienen."/>
  <meta property="og:title" content="PodioSync"/>
  <meta property="og:description" content="Influencers ES/LATAM. Ranking de pago, más queridos y más hate."/>
  <meta property="og:image" content="/public/og.jpg"/>
  <meta name="theme-color" content="#F4F4F6"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <link rel="icon" href="/public/favicon.svg"/>
  <link rel="apple-touch-icon" href="/public/icon.jpg"/>
  <link rel="stylesheet" href="/public/styles.css"/>
</head>
<body>
  <header><div class="wrap">
    <div class="top">
      <a class="wordmark" href="/">Podio<span>Sync</span></a>
      <nav>
        <a class="${nav === "rank" ? "on" : ""}" href="/">Ranking</a>
        <a class="${nav === "love" ? "on" : ""}" href="/?board=love">Queridos</a>
        <a class="${nav === "hate" ? "on" : ""}" href="/?board=hate">Hate</a>
        <a class="${nav === "cats" ? "on" : ""}" href="/categories">Categorías</a>
        <a class="${nav === "claim" ? "on" : ""}" href="/claim">Reclamar</a>
      </nav>
    </div>
  </div></header>
  <main class="wrap">
    ${flash ? `<p class="flash">${esc(flash)}</p>` : ""}
    ${body}
  </main>
  <footer><div class="wrap">
    <p>El puesto de pago es lo que pagas. Queridos y hate los decide el público.</p>
    <div class="stats">
      <div><b>${num(stats.listings)}</b>creadores</div>
      <div><b>${num(stats.visitors)}</b>visitas</div>
      <div><b>${num(stats.online)}</b>online ahora</div>
    </div>
    <p style="margin-top:1.4rem"><a href="/about">About</a> · <a href="/faq">FAQ</a> · <a href="/rules">Reglas</a> · ${esc(stripeBadge())}</p>
  </div></footer>
  <div class="tabbar"><nav>
    <a href="/" class="${nav === "rank" ? "on" : ""}">Ranking</a>
    <a href="/?board=love" class="${nav === "love" ? "on" : ""}">Queridos</a>
    <a href="/?board=hate" class="${nav === "hate" ? "on" : ""}">Hate</a>
    <a href="/claim" class="${nav === "claim" ? "on" : ""}">Reclamar</a>
  </nav></div>
</body></html>`;
}

function avatarHtml(slug, name, cls = "avatar") {
  const file = path.join(__dirname, "public", "avatars", `${slug}.jpg`);
  if (fs.existsSync(file)) {
    return `<img class="${cls}" src="/public/avatars/${esc(slug)}.jpg" alt="${esc(name)}"/>`;
  }
  const parts = String(name || "").trim().split(/\s+/);
  const ini = parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : String(name || "?").slice(0, 2).toUpperCase();
  return `<span class="${cls} fallback">${esc(ini)}</span>`;
}

function catCover(slug) {
  const file = path.join(__dirname, "public", "categories", `${slug}.jpg`);
  return fs.existsSync(file) ? `/public/categories/${slug}.jpg` : "";
}

function voteForms(listing, next = "/") {
  return `<div class="votes">
    <form method="post" action="/vote">
      <input type="hidden" name="slug" value="${esc(listing.slug)}"/>
      <input type="hidden" name="kind" value="love"/>
      <input type="hidden" name="next" value="${esc(next)}"/>
      <button class="love" type="submit">♥ ${compact(listing.love)}</button>
    </form>
    <form method="post" action="/vote">
      <input type="hidden" name="slug" value="${esc(listing.slug)}"/>
      <input type="hidden" name="kind" value="hate"/>
      <input type="hidden" name="next" value="${esc(next)}"/>
      <button class="hate" type="submit">✕ ${compact(listing.hate)}</button>
    </form>
  </div>`;
}

function scoreLabel(listing, board) {
  if (board === "love") return `♥ ${compact(listing.love)}`;
  if (board === "hate") return `✕ ${compact(listing.hate)}`;
  return money(listing.window_amount || listing.amount);
}

function rankArticles(listings, board = "all", next = "/") {
  return `<div class="ios-group">${listings
    .map((l) => {
      const cat = CATEGORY_MAP[l.category_slug];
      return `<article>
        <span class="rank">${l.rank}</span>
        ${avatarHtml(l.slug, l.display_name)}
        <div class="row-main">
          <h2><a href="/creator/${esc(l.slug)}">${esc(l.display_name)}</a></h2>
          <p class="muted" style="font-size:.8rem">${esc(l.handle)}${cat ? ` · ${esc(cat.name)}` : ""}</p>
        </div>
        <div style="text-align:right;display:grid;gap:.25rem;justify-items:end">
          <p class="price">${scoreLabel(l, board)}</p>
          ${voteForms(l, next)}
        </div>
      </article>`;
    })
    .join("")}</div>`;
}

function podiumHtml(listings, board = "all") {
  const top = listings.slice(0, 3);
  if (!top.length) return "";
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  const cls = top.length === 3 ? ["p2", "p1", "p3"] : ["p1", "p2", "p3"];
  return `<div class="podium">${order
    .map((l, i) => {
      const c = cls[i] || "p3";
      return `<a class="card ${c}" href="/creator/${esc(l.slug)}">
        <span class="place">#${l.rank}</span>
        ${avatarHtml(l.slug, l.display_name)}
        <div>
          <h3>${esc(l.display_name)}</h3>
          <p class="muted" style="margin:.2rem 0 0;font-size:.8rem">${esc(l.handle)}</p>
        </div>
        <p class="score">${scoreLabel(l, board)}</p>
      </a>`;
    })
    .join("")}</div>`;
}

function modeTabs(board, cat = "") {
  const q = cat ? `&cat=${esc(cat)}` : "";
  const items = [
    ["all", "Ranking", ""],
    ["love", "Más queridos", "love"],
    ["hate", "Más hate", "hate"],
    ["today", "Últimas 24h", ""],
  ];
  return `<div class="modes">${items
    .map(
      ([id, label, extra]) =>
        `<a class="${extra} ${board === id ? "on" : ""}" href="/?board=${id}${q}">${label}</a>`,
    )
    .join("")}</div>`;
}

function categoryChips(active) {
  const populated = categorySummaries().filter((c) => c.count > 0);
  const links = [`<a class="${active ? "" : "on"}" href="/">Todos</a>`].concat(
    populated.map(
      (c) =>
        `<a class="${active === c.slug ? "on" : ""}" href="/category/${c.slug}">${esc(c.name)}</a>`,
    ),
  );
  return `<div class="chips">${links.join("")}</div>`;
}

function claimForm({ amount, category, handle, error }) {
  const cats = CATEGORIES.map(
    (c) => `<option value="${c.slug}" ${c.slug === category ? "selected" : ""}>${esc(c.name)}</option>`,
  ).join("");
  const countries = COUNTRIES.map(
    (c) => `<option value="${c.code}">${esc(c.name)}</option>`,
  ).join("");
  const platforms = PLATFORMS.map(
    (p) => `<option value="${p.id}">${esc(p.name)}</option>`,
  ).join("");
  return `<h1>Reclamar un puesto</h1>
    <p class="muted">${stripeEnabled() ? "El pago se cobra con Stripe Checkout. El puesto se reclama al confirmar." : "Modo demo: el pago se simula. Pon STRIPE_SECRET_KEY para cobrar de verdad."}</p>
    ${error ? `<p class="err">${esc(error)}</p>` : ""}
    <form method="post" action="/claim" class="panel" style="margin-top:1rem;display:grid;gap:.75rem">
      <label>@handle o URL<input class="field" name="handle" required value="${esc(handle || "")}" placeholder="@lunavarela"/></label>
      <label>Nombre<input class="field" name="displayName" required placeholder="Luna Varela"/></label>
      <label>Tagline<input class="field" name="tagline" placeholder="glow sin filtro"/></label>
      <label>Bio corta<textarea name="description" rows="3" placeholder="Qué haces, desde dónde."></textarea></label>
      <label>Link público<input class="field" name="url" type="url" placeholder="https://instagram.com/…"/></label>
      <div class="row">
        <label>Categoría<select name="category">${cats}</select></label>
        <label>País<select name="country">${countries}</select></label>
        <label>Plataforma<select name="platform">${platforms}</select></label>
      </div>
      <label>Total en el ranking (USD)
        <div class="step-row">
          <button type="button" class="stepper" data-delta="-1">−</button>
          <input class="field" type="number" name="targetTotal" id="claim-total" min="10" max="999999" step="1" value="${Number(amount) || 10}"/>
          <button type="button" class="stepper" data-delta="1">+</button>
        </div>
      </label>
      <button class="btn wide" type="submit">${stripeEnabled() ? "Pagar con Stripe y reclamar" : "Pagar y reclamar el puesto"}</button>
    </form>
    <script>
      document.querySelectorAll("[data-delta]").forEach((b) => {
        b.addEventListener("click", () => {
          const el = document.getElementById("claim-total");
          if (!el) return;
          el.value = Math.max(10, Math.min(999999, Number(el.value || 10) + Number(b.dataset.delta)));
        });
      });
    </script>`
}

app.get("/", (req, res) => {
  bumpVisitor();
  const board =
    req.query.board === "today" ||
    req.query.board === "daily" ||
    req.query.board === "love" ||
    req.query.board === "hate"
      ? req.query.board
      : "all";
  const cat = typeof req.query.cat === "string" ? req.query.cat : "";
  const listings = listBoard(board, cat || null);
  const stats = getStats();
  const top = listings[0];
  const take = claimPriceFor(top?.window_amount ?? top?.amount ?? 0, true);
  const nav = board === "love" || board === "hate" ? board : "rank";
  const titles = {
    all: "El ranking de influencers ES & LATAM",
    love: "Los más queridos",
    hate: "Los que más hate tienen",
    today: "Lo que se movió en 24 horas",
    daily: "Ranking del día",
  };
  const leads = {
    all: "Cada categoría tiene su propio podio. El puesto de pago es lo que pagas. El cariño y el hate los vota el público.",
    love: "Un voto por persona y creador. Cambia a hate si te arrepientes. Gana quien más corazones suma.",
    hate: "El tablero del drama. No es un pago: es lo que la gente marca. Un voto por persona.",
    today: "Solo cuentan los pagos de las últimas 24 horas.",
    daily: "El recuento del día UTC.",
  };
  const next = `/?board=${board}${cat ? `&cat=${esc(cat)}` : ""}`;
  let boardBody = "";
  if (!listings.length) {
    boardBody = `<p class="muted">Nadie en este tablero todavía.</p>`;
  } else if (board === "love" || board === "hate" || board === "today" || cat) {
    boardBody = `${podiumHtml(listings, board)}${rankArticles(listings.slice(3), board, next)}`;
  } else {
    const groups = CATEGORIES.map((c) => ({
      ...c,
      items: listings.filter((l) => l.category_slug === c.slug).slice(0, 6),
    })).filter((c) => c.items.length);
    boardBody = `${podiumHtml(listings, board)}${groups
      .map((c) => {
        const local = c.items.map((l, i) => ({ ...l, rank: i + 1 }));
        return `<section class="rail">
          <div class="rail-head">
            <h2>${esc(c.name)}</h2>
            <a href="/category/${c.slug}">Ver todos</a>
          </div>
          ${rankArticles(local, board, next)}
        </section>`;
      })
      .join("")}`;
  }
  res.type("html").send(
    layout({
      title: titles[board] || "Ranking",
      stats,
      nav,
      flash: req.query.ok ? `Listo. Estás en el #${esc(req.query.rank || "")}.` : "",
      body: `
      <section class="hero">
        <div>
          <p class="muted" style="margin:0 0 .4rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;font-size:.72rem">PodioSync</p>
          <h1>${esc(titles[board])}</h1>
          <p class="lead">${esc(leads[board])}</p>
          <div class="hero-actions">
            <a class="btn" href="/claim?amount=${take}">Reclamar #1 por ${money(take)}</a>
            <a class="btn ghost" href="/categories">Explorar categorías</a>
          </div>
        </div>
        <div class="panel" style="margin:0">
          <p class="muted" style="margin:0 0 .4rem;font-size:.8rem;font-weight:700">Ahora mismo</p>
          <p style="margin:0;font-size:1.05rem;font-weight:750">${top ? `#1 ${esc(top.display_name)}` : "Sin #1"}</p>
          <p class="muted" style="margin:.35rem 0 0">${top ? scoreLabel(top, board) : "—"} · ${num(stats.listings)} perfiles</p>
        </div>
      </section>
      ${modeTabs(board, cat)}
      ${categoryChips(cat)}
      ${boardBody}`,
    }),
  );
});

app.get("/categories", (_req, res) => {
  const stats = getStats();
  const cats = categorySummaries()
    .filter((c) => c.count > 0)
    .map((c) => {
      const cover = catCover(c.slug);
      return `<a href="/category/${c.slug}">
        ${cover ? `<img src="${cover}" alt=""/>` : `<div class="cat-ph"></div>`}
        <span>${esc(c.name)}</span>
        <small>${c.count} creadores${c.leader ? ` · #1 ${esc(c.leader.name)}` : ""}</small>
      </a>`;
    })
    .join("");
  res.type("html").send(
    layout({
      title: "Categorías",
      nav: "cats",
      stats,
      body: `<h1>Categorías</h1><p class="lead">Cada nicho tiene ranking, queridos y hate.</p><div class="cat-grid">${cats}</div>`,
    }),
  );
});

app.get("/category/:slug", (req, res) => {
  const cat = CATEGORY_MAP[req.params.slug];
  const board =
    req.query.board === "today" ||
    req.query.board === "love" ||
    req.query.board === "hate"
      ? req.query.board
      : "all";
  const listings = listBoard(board, req.params.slug);
  const stats = getStats();
  const take = claimPriceFor(listings[0]?.amount ?? 0, true);
  const cover = catCover(req.params.slug);
  const next = `/category/${esc(req.params.slug)}?board=${board}`;
  const tabs = [
    ["all", "Ranking"],
    ["love", "Queridos"],
    ["hate", "Hate"],
  ]
    .map(
      ([id, label]) =>
        `<a class="${board === id ? "on" : ""}" href="/category/${esc(req.params.slug)}?board=${id}">${label}</a>`,
    )
    .join("");
  res.type("html").send(
    layout({
      title: cat?.name || req.params.slug,
      nav: "cats",
      stats,
      body: `<p class="muted"><a href="/categories">Categorías</a> / ${esc(cat?.name || req.params.slug)}</p>
        ${cover ? `<img class="cover" src="${cover}" alt=""/>` : ""}
        <h1>${esc(cat?.name || req.params.slug)}</h1>
        <p class="lead">${esc(cat?.blurb || "")}</p>
        <p style="margin-top:1rem"><a class="btn" href="/claim?amount=${take}&category=${esc(req.params.slug)}">Reclamar #1 por ${money(take)}</a></p>
        <div class="modes" style="margin-top:1.2rem">${tabs}</div>
        ${listings.length ? podiumHtml(listings, board) + rankArticles(listings.slice(3), board, next) : `<p class="muted">Nadie en esta categoría todavía.</p>`}`,
    }),
  );
});

app.get("/creator/:slug", (req, res) => {
  const found = getListing(req.params.slug);
  const stats = getStats();
  if (!found) return res.status(404).type("html").send(layout({ title: "404", stats, body: "<h1>No está en el ranking</h1>" }));
  const { listing, payments } = found;
  const cat = CATEGORY_MAP[listing.category_slug];
  const price = claimPriceFor(listing.amount, listing.rank === 1);
  const next = `/creator/${listing.slug}`;
  const pays = payments
    .map((p) => `<li style="display:flex;justify-content:space-between"><span class="muted">${ago(p.created_at)}</span><span>${money(p.amount)}</span></li>`)
    .join("");
  res.type("html").send(
    layout({
      title: listing.display_name,
      stats,
      body: `<p class="muted"><a href="/">Ranking</a> ${cat ? `/ <a href="/category/${listing.category_slug}">${esc(cat.name)}</a>` : ""}</p>
        <div class="profile">
          <div>
            <div class="profile-hero">
              ${avatarHtml(listing.slug, listing.display_name)}
              <div>
                <p class="muted" style="margin:0;font-weight:700">#${listing.rank} · ${money(listing.amount)}</p>
                <h1>${esc(listing.display_name)}</h1>
                <p class="muted">${esc(listing.tagline)}</p>
              </div>
            </div>
            <p style="margin-top:1rem">${esc(listing.description)}</p>
            <p class="muted" style="margin-top:.6rem">${esc(listing.handle)} · ${esc(COUNTRY_MAP[listing.country] || "")} · ${esc(PLATFORM_MAP[listing.platform] || "")}</p>
            <div style="margin-top:1rem">${voteForms(listing, next)}</div>
            <p style="margin-top:1.1rem;display:flex;flex-wrap:wrap;gap:.5rem">
              ${listing.url ? `<a class="btn ghost" href="/go/${listing.slug}">Abrir perfil</a>` : ""}
              <a class="btn" href="/claim?amount=${price}&category=${listing.category_slug}&handle=${encodeURIComponent(listing.handle)}">Superar por ${money(price)}</a>
            </p>
          </div>
          <div class="panel">
            <h2>Pagos</h2>
            <ul class="list">${pays}</ul>
          </div>
        </div>`,
    }),
  );
});

app.get("/go/:slug", (req, res) => {
  const found = getListing(req.params.slug);
  if (!found?.listing?.url) return res.redirect("/");
  registerClick(req.params.slug);
  res.redirect(found.listing.url);
});

app.post("/vote", (req, res) => {
  const slug = String(req.body.slug || "").slice(0, 64);
  const kind = req.body.kind === "hate" ? "hate" : "love";
  const nextRaw = String(req.body.next || "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  voteOn(slug, kind, req.voter);
  res.redirect(303, next);
});

app.get("/claim", (req, res) => {
  const stats = getStats();
  res.type("html").send(
    layout({
      title: "Reclamar",
      stats,
      flash: req.query.canceled ? "Pago cancelado. Puedes intentarlo de nuevo." : "",
      body: claimForm({
        amount: req.query.amount,
        category: req.query.category || CATEGORIES[0].slug,
        handle: req.query.handle || "",
      }),
    }),
  );
});

app.get("/paid", async (req, res) => {
  const stats = getStats();
  const sessionId = String(req.query.session_id || "");
  if (!sessionId) return res.redirect("/");
  if (!stripeEnabled()) return res.redirect("/");
  try {
    const session = await retrieveSession(sessionId);
    if (!sessionIsPaid(session)) {
      return res.type("html").send(
        layout({
          title: "Confirmando pago",
          stats,
          body: `<h1>Confirmando el pago</h1>
            <p class="muted">Stripe todavía no marcó este pago como cobrado. Recarga en unos segundos.</p>
            <p><a class="btn" href="/paid?session_id=${esc(sessionId)}">Reintentar</a></p>`,
        }),
      );
    }
    const payload =
      getPending(session.client_reference_id) || payloadFromMetadata(session.metadata);
    if (!payload) {
      return res.type("html").send(
        layout({
          title: "Pago recibido",
          stats,
          body: `<h1>Pago recibido</h1>
            <p class="muted">Stripe cobró, pero no encontramos la ficha. Escribe a soporte con el id ${esc(sessionId)}.</p>`,
        }),
      );
    }
    const result = fulfillPaid(session.id, payload);
    if (!result.ok) {
      return res.type("html").send(
        layout({
          title: "Pago recibido",
          stats,
          body: `<h1>Pago recibido</h1>
            <p class="err">${esc(result.error)}</p>
            <p class="muted">El cobro está en Stripe. Id ${esc(sessionId)}.</p>`,
        }),
      );
    }
    return res.redirect(303, `/?ok=1&rank=${result.rank}`);
  } catch (err) {
    return res.status(400).type("html").send(
      layout({
        title: "Pago",
        stats,
        body: `<h1>No se pudo confirmar</h1><p class="err">${esc(err.message)}</p>`,
      }),
    );
  }
});

app.post("/claim", async (req, res) => {
  const quoted = quoteClaim({
    handle: req.body.handle,
    displayName: req.body.displayName,
    tagline: req.body.tagline,
    description: req.body.description,
    url: req.body.url,
    platform: req.body.platform,
    country: req.body.country,
    category: req.body.category,
    targetTotal: Number(req.body.targetTotal),
  });
  if (!quoted.ok) {
    const stats = getStats();
    return res.status(400).type("html").send(
      layout({
        title: "Reclamar",
        stats,
        body: claimForm({ ...req.body, amount: req.body.targetTotal, error: quoted.error }),
      }),
    );
  }
  const payload = quoted.payload;
  if (stripeEnabled()) {
    try {
      const origin = originFrom(req);
      if (!origin) throw new Error("Falta PUBLIC_URL (o el host de la petición).");
      const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      putPending(id, payload, { charged: quoted.charged });
      const session = await createCheckout({
        claimId: id,
        payload,
        charged: quoted.charged,
        origin,
      });
      return res.redirect(303, session.url);
    } catch (err) {
      const stats = getStats();
      return res.status(400).type("html").send(
        layout({
          title: "Reclamar",
          stats,
          body: claimForm({ ...payload, amount: payload.targetTotal, error: err.message }),
        }),
      );
    }
  }
  const result = claimRank(payload);
  if (!result.ok) {
    const stats = getStats();
    return res.status(400).type("html").send(
      layout({
        title: "Reclamar",
        stats,
        body: claimForm({ ...payload, amount: payload.targetTotal, error: result.error }),
      }),
    );
  }
  res.redirect(303, `/?ok=1&rank=${result.rank}`);
});

app.get("/about", (_req, res) => {
  const stats = getStats();
  res.type("html").send(
    layout({
      title: "About",
      stats,
      body: `<h1>About</h1>
        <p>podiosync.es es el ranking público de influencers de España y Latinoamérica. Tres tableros: el de pago (el puesto es lo que pagas), los más queridos y los de más hate.</p>
        <p>Las fichas de demostración son perfiles de ejemplo. En producción, cada creator, manager o marca reclama su propio @handle.</p>
        <div class="stats">
          <div><b>${money(stats.revenue)}</b>ingresos</div>
          <div><b>${num(stats.listings)}</b>creadores</div>
          <div><b>${num(stats.visitors)}</b>visitantes</div>
        </div>`,
    }),
  );
});

app.get("/faq", (_req, res) => {
  const stats = getStats();
  res.type("html").send(
    layout({
      title: "FAQ",
      stats,
      body: `<h1>FAQ</h1>
        <h2>¿Cómo funciona?</h2>
        <p class="muted">Pegas un @handle, eliges categoría y pagas. Mínimo $10. Quitar el #1 cuesta $5 más que el actual. A igual monto, gana quien llegó primero.</p>
        <h2>¿Más queridos y más hate?</h2>
        <p class="muted">Son tableros de voto del público, no de pago. Un voto por persona y creador. Puedes cambiar de querido a hate (o al revés). No hay reembolsos de votos.</p>
        <h2>¿All-time, Hoy y Diario?</h2>
        <p class="muted">Un pago cuenta en todos los tableros. All-time no caduca. Hoy es 24 h. Diario es el día UTC.</p>
        <h2>¿Hay reembolsos?</h2>
        <p class="muted">No. Pagos finales.</p>
        <h2>¿El pago es real?</h2>
        <p class="muted">${stripeEnabled() ? "Sí. Stripe Checkout. El puesto se asigna al confirmar el pago (página de éxito + webhook)." : "En esta instalación corre en modo demo. Añade STRIPE_SECRET_KEY para cobrar."}</p>`
    }),
  );
});

app.get("/rules", (_req, res) => {
  const stats = getStats();
  res.type("html").send(
    layout({
      title: "Reglas",
      stats,
      body: `<h1>Reglas</h1>
        <p>PodioSync es un ranking público. El rank es lo que pagas — nada más.</p>
        <ul>
          <li>Fichas nuevas: dólares enteros, mínimo $10, máximo $999,999.</li>
          <li>Quitar el #1: al menos $5 más que el actual.</li>
          <li>A igual monto, se queda arriba quien llegó primero.</li>
          <li>Si ya estás, el checkout solo cobra la diferencia.</li>
          <li>Un @handle es una sola ficha.</li>
        </ul>`,
    }),
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`podiosync listening on 0.0.0.0:${PORT}`);
});
