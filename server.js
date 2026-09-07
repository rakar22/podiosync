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

function layout({ title, stats, body, flash }) {
  const days = Math.max(
    1,
    Math.round((Date.now() - new Date(stats.launched_at).getTime()) / 86_400_000),
  );
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(title)} · PodioSync</title>
  <meta name="description" content="Reclama un puesto en el ranking público de influencers de España y Latinoamérica."/>
  <meta property="og:title" content="PodioSync"/>
  <meta property="og:description" content="El ranking público de influencers ES/LATAM. El puesto es lo que pagas."/>
  <meta property="og:image" content="/public/og.jpg"/>
  <meta name="theme-color" content="#F2F2F7"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <link rel="icon" href="/public/favicon.svg"/>
  <link rel="apple-touch-icon" href="/public/icon.jpg"/>
  <link rel="stylesheet" href="/public/styles.css"/>
</head>
<body>
  <header><div class="wrap">
    <div class="top">
      <a class="wordmark" href="/">PodioSync</a>
      <nav>
        <a href="/categories">Explorar</a>
        <a href="/about">About</a>
        <a href="/faq">FAQ</a>
        <a href="/rules">Reglas</a>
      </nav>
    </div>
    <p class="meta"><b>${stats.online} online</b> · ${num(stats.visitors)} visitantes · <a href="/about">stats</a> · <span>${stripeBadge()}</span></p>
  </div></header>
  <main class="wrap">
    ${flash ? `<p class="flash">${esc(flash)}</p>` : ""}
    ${body}
  </main>
  <footer><div class="wrap">
    <p>Algunas cifras de este <a href="/about">side project</a> desde su lanzamiento hace ${days} días</p>
    <div class="stats">
      <div><b>$ ${num(stats.revenue)}</b>ingresos</div>
      <div><b>${num(stats.listings)}</b>creadores en el ranking</div>
      <div><b>${num(stats.visitors)}</b>visitantes</div>
    </div>
    <p style="margin-top:1.5rem">Rank is what you pay.</p>
  </div></footer>
  <div class="tabbar"><nav>
    <a href="/" class="${title !== "Categorías" && title !== "Reclamar" ? "on" : ""}">Ranking</a>
    <a href="/categories" class="${title === "Categorías" ? "on" : ""}">Nichos</a>
    <a href="/claim">Reclamar</a>
  </nav></div>
</body></html>`;
}

function avatarHtml(slug, name) {
  const file = path.join(__dirname, "public", "avatars", `${slug}.jpg`);
  if (fs.existsSync(file)) {
    return `<img class="avatar" src="/public/avatars/${esc(slug)}.jpg" alt=""/>`;
  }
  const parts = String(name || "").trim().split(/\s+/);
  const ini = parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : String(name || "?").slice(0, 2).toUpperCase();
  return `<span class="avatar fallback">${esc(ini)}</span>`;
}

function rankArticles(listings) {
  return `<div class="ios-group">${listings
    .map((l) => {
      const cat = CATEGORY_MAP[l.category_slug];
      const price = claimPriceFor(l.window_amount || l.amount, l.rank === 1);
      return `<article>
        <span class="rank">${l.rank}</span>
        ${avatarHtml(l.slug, l.display_name)}
        <div class="row-main">
          <h2><a href="/creator/${esc(l.slug)}">${esc(l.display_name)}</a></h2>
          <p class="muted" style="margin:0;font-size:.8rem">${esc(l.handle)}${cat ? ` · ${esc(cat.name)}` : ""}</p>
        </div>
        <div style="text-align:right">
          <p class="price">${money(l.window_amount || l.amount)}</p>
          <a href="/claim?amount=${price}&category=${esc(l.category_slug)}&handle=${encodeURIComponent(l.handle)}" class="muted" style="font-size:.75rem;font-weight:600">Reclamar</a>
        </div>
      </article>`;
    })
    .join("")}</div>`;
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
      <button class="btn" type="submit">${stripeEnabled() ? "Pagar con Stripe y reclamar" : "Pagar y reclamar el puesto"}</button>
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
  const board = req.query.board === "today" || req.query.board === "daily" ? req.query.board : "all";
  const cat = typeof req.query.cat === "string" ? req.query.cat : "";
  const listings = listBoard(board, cat || null);
  const activity = listActivity();
  const stats = getStats();
  const top = listings[0];
  const take = claimPriceFor(top?.window_amount ?? 0, true);
  const catOpts = [`<option value="">Todas · ranking global</option>`]
    .concat(CATEGORIES.map((c) => `<option value="${c.slug}" ${c.slug === cat ? "selected" : ""}>${esc(c.name)}</option>`))
    .join("");
  const tabs = [
    ["all", "All-time"],
    ["today", "Hoy"],
    ["daily", "Diario"],
  ]
    .map(
      ([id, label]) =>
        `<a class="${board === id ? "on" : ""}" href="/?board=${id}${cat ? `&cat=${esc(cat)}` : ""}">${label}</a>`,
    )
    .join("");
  const acts = activity
    .map(
      (a) =>
        `<li><a href="/creator/${esc(a.slug)}">${esc(a.display_name)}</a> <span class="muted">${a.kind === "raise" ? "subió" : "entró"}${a.rank ? ` al #${a.rank}` : ""} · ${money(a.amount)}</span><div class="subtle">${ago(a.created_at)}</div></li>`,
    )
    .join("");
  res.type("html").send(
    layout({
      title: "Reclama un puesto",
      stats,
      flash: req.query.ok ? `Listo. Estás en el #${esc(req.query.rank || "")}.` : "",
      body: `
      <section class="panel">
        <h1 id="claim-title">Reclama el #1 por ${money(take)}</h1>
        <p class="muted">El ranking público de influencers de España y Latinoamérica. Sin ads, sin API keys, sin revenue share. El puesto es lo que pagas.</p>
        <ol class="how">
          <li><b>1. Elige nicho.</b> TikTok, Twitch, belleza, fútbol…</li>
          <li><b>2. Pagas.</b> Mínimo $10. Quitar el #1 cuesta $5 más.</li>
          <li><b>3. Subes.</b> Un pago confirmado reordena el tablero.</li>
        </ol>
        <form method="get" action="/claim" class="row" id="claim-top">
          <label>Elige una categoría<select name="category">${catOpts}</select></label>
          <div class="step-row">
            <button type="button" class="stepper" data-delta="-1" aria-label="Bajar">−</button>
            <input class="field" type="number" name="amount" id="claim-amount" min="10" max="999999" step="1" value="${take}"/>
            <button type="button" class="stepper" data-delta="1" aria-label="Subir">+</button>
          </div>
          <button class="btn" type="submit">Reclamar puesto</button>
        </form>
      </section>
      <script>
        document.querySelectorAll("#claim-top .stepper").forEach((b) => {
          b.addEventListener("click", () => {
            const el = document.getElementById("claim-amount");
            const next = Math.max(10, Number(el.value || 10) + Number(b.dataset.delta));
            el.value = next;
            const h = document.getElementById("claim-title");
            if (h) h.textContent = "Reclama el #1 por $" + next.toLocaleString("en-US");
          });
        });
      </script>
      <div class="tabs">${tabs}</div>
      ${listings.length ? rankArticles(listings) : `<p class="muted">Nadie ha pagado en esta ventana. El #1 cuesta $10.</p>`}
      <h2 style="margin-top:3rem">Última actividad</h2>
      <ul class="list">${acts}</ul>`,
    }),
  );
});

app.get("/categories", (_req, res) => {
  const stats = getStats();
  const cats = categorySummaries()
    .filter((c) => c.count > 0)
    .map(
      (c) => `<li>
        <a href="/category/${c.slug}"><strong>${esc(c.name)}</strong></a>
        <p class="muted">${esc(c.blurb)}</p>
        ${c.leader ? `<p>#1 <a href="/creator/${c.leader.slug}">${esc(c.leader.name)}</a> <span class="wine">${money(c.leader.amount)}</span></p>` : ""}
        <p class="subtle">${c.count} en el ranking</p>
      </li>`,
    )
    .join("");
  res.type("html").send(
    layout({
      title: "Categorías",
      stats,
      body: `<h1>Categorías</h1><p class="muted">Cada nicho tiene su propio ranking.</p><ul class="list">${cats}</ul>`,
    }),
  );
});

app.get("/category/:slug", (req, res) => {
  const cat = CATEGORY_MAP[req.params.slug];
  const board = req.query.board === "today" || req.query.board === "daily" ? req.query.board : "all";
  const listings = listBoard(board, req.params.slug);
  const stats = getStats();
  const take = claimPriceFor(listings[0]?.window_amount ?? 0, true);
  const tabs = [
    ["all", "All-time"],
    ["today", "Hoy"],
    ["daily", "Diario"],
  ]
    .map(
      ([id, label]) =>
        `<a class="${board === id ? "on" : ""}" href="/category/${esc(req.params.slug)}?board=${id}">${label}</a>`,
    )
    .join("");
  res.type("html").send(
    layout({
      title: cat?.name || req.params.slug,
      stats,
      body: `<p class="muted"><a href="/categories">Categorías</a> / ${esc(cat?.name || req.params.slug)}</p>
        <h1>${esc(cat?.name || req.params.slug)}</h1>
        <p class="muted">${esc(cat?.blurb || "")}</p>
        <p><a class="btn" href="/claim?amount=${take}&category=${esc(req.params.slug)}">Reclamar #1 por ${money(take)}</a></p>
        <div class="tabs">${tabs}</div>
        ${listings.length ? rankArticles(listings) : `<p class="muted">Nadie en esta categoría todavía.</p>`}`,
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
  const pays = payments
    .map((p) => `<li style="display:flex;justify-content:space-between"><span class="muted">${ago(p.created_at)}</span><span>${money(p.amount)}</span></li>`)
    .join("");
  res.type("html").send(
    layout({
      title: listing.display_name,
      stats,
      body: `<p class="muted"><a href="/">Ranking</a> ${cat ? `/ <a href="/category/${listing.category_slug}">${esc(cat.name)}</a>` : ""}</p>
        <p class="rank">#${listing.rank}</p>
        <h1>${esc(listing.display_name)}</h1>
        <p class="muted">${esc(listing.tagline)}</p>
        <p class="price">${money(listing.amount)}</p>
        <p>${esc(listing.description)}</p>
        <p class="chips">
          <span>${esc(listing.handle)}</span>
          <span>${esc(COUNTRY_MAP[listing.country] || "")}</span>
          <span>${esc(PLATFORM_MAP[listing.platform] || "")}</span>
          <span>${num(listing.clicks)} clics</span>
        </p>
        <p>
          ${listing.url ? `<a class="btn ghost" href="/go/${listing.slug}">Abrir perfil</a> ` : ""}
          <a class="btn" href="/claim?amount=${price}&category=${listing.category_slug}&handle=${encodeURIComponent(listing.handle)}">Reclamar este puesto por ${money(price)}</a>
        </p>
        <h2>Pagos</h2>
        <ul class="list">${pays}</ul>`,
    }),
  );
});

app.get("/go/:slug", (req, res) => {
  const found = getListing(req.params.slug);
  if (!found?.listing?.url) return res.redirect("/");
  registerClick(req.params.slug);
  res.redirect(found.listing.url);
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
        <p>podiosync.es es el ranking público de influencers de España y Latinoamérica donde el puesto es lo que pagas. Sin ads, sin API keys, sin revenue share.</p>
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
