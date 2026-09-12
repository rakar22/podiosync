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
} from "./categories.js";
import { formatUsd } from "./store.js";
import { stripeEnabled, stripeMode } from "./payments.js";
import {
  listingSocials,
  platformIcon,
  primarySocial,
  socialHref,
} from "./socials.js";
import {
  creatorsIndex,
  lastUpdatedIso,
  polarizationIndex,
  polarizationLabel,
} from "./insights.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

export function siteOrigin() {
  return (process.env.PUBLIC_URL || "https://podiosync.es").replace(/\/$/, "");
}

export function stripeBadge() {
  const m = stripeMode();
  if (m === "live") return "Stripe · pagos reales";
  if (m === "test") return "Stripe test";
  if (m === "on") return "Stripe";
  return "modo demo";
}

export function money(n) {
  return formatUsd(n);
}

export function num(n) {
  return new Intl.NumberFormat("es-ES").format(Number(n) || 0);
}

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function compact(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")} M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1).replace(".0", "")} mil`;
  return num(v);
}

export function ago(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

export function hasAvatar(slug) {
  return fs.existsSync(path.join(ROOT, "public", "avatars", `${slug}.jpg`));
}

export function catCover(slug) {
  const file = path.join(ROOT, "public", "categories", `${slug}.jpg`);
  return fs.existsSync(file) ? `/public/categories/${slug}.jpg` : "";
}

export function avatarHtml(slug, name, cls = "avatar", { lazy = true } = {}) {
  if (hasAvatar(slug)) {
    const loading = lazy ? ` loading="lazy" decoding="async"` : ` decoding="async"`;
    return `<img class="${cls}" src="/public/avatars/${esc(slug)}.jpg" alt="${esc(name)}"${loading}/>`;
  }
  const parts = String(name || "")
    .trim()
    .split(/\s+/);
  const ini =
    parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : String(name || "?").slice(0, 2).toUpperCase();
  return `<span class="${cls} fallback" aria-hidden="true">${esc(ini)}</span>`;
}

const CAT_MARK = {
  streaming: "live",
  tiktok: "tt",
  youtube: "yt",
  instagram: "ig",
  gaming: "play",
  humor: "lol",
  belleza: "glow",
  fitness: "fit",
  musica: "♪",
  gastro: "mesa",
  moda: "look",
  viajes: "map",
  finanzas: "$",
  deportes: "gol",
  lifestyle: "day",
  educacion: "aula",
  noticias: "now",
  podcast: "mic",
  baile: "move",
  tech: "dev",
  familia: "casa",
  agencias: "hq",
};

export function catMark(slug) {
  return CAT_MARK[slug] || String(slug || "·").slice(0, 4);
}

export const OFFICIAL_TIKTOK_HANDLE = "@podiosync";
export const OFFICIAL_TIKTOK_URL = "https://www.tiktok.com/@podiosync";

function iconSearch() {
  return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

function iconTikTok() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M16.6 5.82c1.1 1.24 2.6 2.08 4.28 2.26v3.18a8.3 8.3 0 0 1-4.28-1.22v6.7a6.74 6.74 0 1 1-6.74-6.74c.3 0 .6.02.9.07v3.3a3.52 3.52 0 1 0 2.48 3.37V3.5h3.36c.1.78.3 1.53.6 2.32Z"/></svg>`;
}

export function officialSocials() {
  return `<nav class="socials" aria-label="Redes de PodioSync">
    <a class="social-link" href="${esc(OFFICIAL_TIKTOK_URL)}" target="_blank" rel="noopener noreferrer" aria-label="TikTok oficial de PodioSync, ${esc(OFFICIAL_TIKTOK_HANDLE)}">
      ${iconTikTok()}
      <span>TikTok</span>
      <span class="handle">${esc(OFFICIAL_TIKTOK_HANDLE)}</span>
    </a>
  </nav>`;
}

export function socialChipHtml(listing, social) {
  const href = socialHref(listing, social);
  if (!href) return "";
  const caption = social.caption || "";
  const label = `${social.label}${caption ? ` ${caption}` : ""}`;
  return `<a class="social-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}">
      ${platformIcon(social.platform, 16)}
      <span>${esc(social.label)}</span>
      ${caption ? `<span class="handle">${esc(caption)}</span>` : ""}
    </a>`;
}

export function creatorSocialsHtml(listing) {
  const socials = listingSocials(listing);
  if (!socials.length) return "";
  const who = listing.display_name || listing.handle || "este creador";
  return `<section class="redes" aria-labelledby="redes-title">
    <h2 id="redes-title">Redes</h2>
    <nav class="socials creator-socials" aria-label="Redes de ${esc(who)}">
      ${socials.map((s) => socialChipHtml(listing, s)).join("")}
    </nav>
  </section>`;
}

export function compactSocialHtml(listing, extraClass = "") {
  const social = primarySocial(listing);
  if (!social) return "";
  const href = socialHref(listing, social);
  if (!href) return "";
  const caption = social.caption || "";
  const label = `Abrir ${social.label}${caption ? ` ${caption}` : ""}`;
  const cls = extraClass ? `social-out ${extraClass}` : "social-out";
  return `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}" title="${esc(label)}">${platformIcon(social.platform, 15)}</a>`;
}

function iconMenu() {
  return `<svg class="nav-toggle-bars" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 8h14M5 12h14M5 16h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

function tabIcon(name) {
  const icons = {
    home: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4.5 11 12 4.5 19.5 11v8.2a1.3 1.3 0 0 1-1.3 1.3H5.8a1.3 1.3 0 0 1-1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.5 20.5v-6h5v6" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>`,
    rank: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 18V10M12 18V6M19 18v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    trend: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 16.5 9.2 11l3.4 3.2L20 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 7.5H20V13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    search: iconSearch(),
    claim: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 19.2c.7-3.2 3.2-5 6.5-5s5.8 1.8 6.5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  };
  return icons[name] || "";
}

export function voteForms(listing, next = "/") {
  return `<div class="votes">
    <form method="post" action="/vote">
      <input type="hidden" name="slug" value="${esc(listing.slug)}"/>
      <input type="hidden" name="kind" value="love"/>
      <input type="hidden" name="next" value="${esc(next)}"/>
      <button class="love" type="submit" aria-label="Votar querido a ${esc(listing.display_name)}">♥ ${compact(listing.love)}</button>
    </form>
    <form method="post" action="/vote">
      <input type="hidden" name="slug" value="${esc(listing.slug)}"/>
      <input type="hidden" name="kind" value="hate"/>
      <input type="hidden" name="next" value="${esc(next)}"/>
      <button class="hate" type="submit" aria-label="Votar hate a ${esc(listing.display_name)}">✕ ${compact(listing.hate)}</button>
    </form>
  </div>`;
}

export function scoreLabel(listing, board) {
  if (board === "love") return `♥ ${compact(listing.love)}`;
  if (board === "hate") return `✕ ${compact(listing.hate)}`;
  return money(listing.window_amount ?? listing.amount);
}

function variationPill(listing, board) {
  if (board === "love" || board === "hate") {
    const idx = polarizationIndex(listing.love, listing.hate);
    if (idx == null) return "";
    return `<span class="pill polar" title="Polarización: 2 × min(♥,✕) / (♥+✕)">Pol. ${idx}%</span>`;
  }
  const paid = Number(listing.paid_24h) || 0;
  if (paid > 0) return `<span class="pill up">+${money(paid)} · 24h</span>`;
  return "";
}

export function rankArticles(listings, board = "all", next = "/") {
  return `<div class="ios-group rank-list">${listings
    .map((l) => {
      const cat = CATEGORY_MAP[l.category_slug];
      return `<article>
        <span class="rank">${l.rank}</span>
        ${avatarHtml(l.slug, l.display_name)}
        <div class="row-main">
          <h2><a href="/creator/${esc(l.slug)}">${esc(l.display_name)}</a></h2>
          <p class="muted">${esc(l.handle)}${cat ? ` · ${esc(cat.name)}` : ""}${l.country ? ` · ${esc(COUNTRY_MAP[l.country] || l.country)}` : ""}</p>
          ${voteForms(l, next)}
        </div>
        <div class="row-meta">
          ${compactSocialHtml(l)}
          ${variationPill(l, board)}
          <p class="price">${scoreLabel(l, board)}</p>
        </div>
      </article>`;
    })
    .join("")}</div>`;
}

export function podiumHtml(listings, board = "all") {
  const top = listings.slice(0, 3);
  if (!top.length) return "";
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  const cls = top.length === 3 ? ["p2", "p1", "p3"] : ["p1", "p2", "p3"];
  return `<div class="podium" aria-label="Podio">${order
    .map((l, i) => {
      const c = cls[i] || "p3";
      const cat = CATEGORY_MAP[l.category_slug];
      return `<article class="card ${c}">
        <a class="card-main" href="/creator/${esc(l.slug)}">
          <span class="place">#${l.rank}</span>
          ${avatarHtml(l.slug, l.display_name, "avatar", { lazy: false })}
          <div>
            <h3>${esc(l.display_name)}</h3>
            <p class="muted">${esc(l.handle)}${cat ? ` · ${esc(cat.name)}` : ""}</p>
          </div>
          <p class="score">${scoreLabel(l, board)}</p>
          ${variationPill(l, board)}
        </a>
        ${compactSocialHtml(l, "podium-social")}
      </article>`;
    })
    .join("")}</div>`;
}

export function qs(params) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "" || v === false) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export function modeTabs(board, { cat = "", region = "all", base = "/" } = {}) {
  const items = [
    ["all", "Ranking", ""],
    ["love", "Más queridos", "love"],
    ["hate", "Más hate", "hate"],
    ["today", "Últimas 24h", "trend"],
  ];
  return `<div class="modes" role="tablist" aria-label="Tableros">${items
    .map(([id, label, extra]) => {
      const href = `${base}${qs({ board: id === "all" ? "" : id, cat, region: region === "all" ? "" : region })}`.replace(
        /\/\?$/,
        "/",
      );
      return `<a class="${extra} ${board === id ? "on" : ""}" href="${href}" role="tab" aria-selected="${board === id ? "true" : "false"}">${label}</a>`;
    })
    .join("")}</div>`;
}

export function regionTabs(region, extra = {}) {
  const { base = "/", ...params } = extra;
  const items = [
    ["all", "ES + LATAM"],
    ["es", "España"],
    ["latam", "LATAM"],
  ];
  return `<div class="region" role="group" aria-label="Región">${items
    .map(([id, label]) => {
      const href = `${base}${qs({ ...params, region: id === "all" ? "" : id })}`.replace(/\/\?$/, "/");
      return `<a class="${region === id ? "on" : ""}" href="${href}">${label}</a>`;
    })
    .join("")}</div>`;
}

export function categoryChips(active, { board = "all", region = "all", cats = [] } = {}) {
  const populated = (cats.length ? cats : CATEGORIES).filter((c) => c.count == null || c.count > 0);
  const links = [
    `<a class="${active ? "" : "on"}" href="/${qs({ board: board === "all" ? "" : board, region: region === "all" ? "" : region })}">Todos</a>`,
  ].concat(
    populated.map((c) => {
      const href = `/category/${c.slug}${qs({ board: board === "all" ? "" : board, region: region === "all" ? "" : region })}`;
      return `<a class="${active === c.slug ? "on" : ""}" href="${href}">${esc(c.name)}</a>`;
    }),
  );
  return `<div class="chips" aria-label="Categorías">${links.join("")}</div>`;
}

export function trendingSection(trending, board = "all") {
  const blocks = [
    ["rising", "En alza (24h)", "Pagos registrados en las últimas 24 horas.", trending.rising, "today"],
    ["voted", "Más votados", "Suma de votos de cariño y hate del público.", trending.voted, "votes"],
    ["newest", "Recién llegados", "Fichas creadas en los últimos 14 días.", trending.newest, "new"],
    ["polarized", "Más polarizados", "Cariño y hate más empatados.", trending.polarized, "polar"],
  ].filter(([, , , rows]) => rows && rows.length);
  if (!blocks.length) return "";
  return `<section class="trending" aria-labelledby="trending-title">
    <div class="section-head">
      <div>
        <p class="eyebrow">Señales del tablero</p>
        <h2 id="trending-title">Trending</h2>
        <p class="muted">Calculado a partir de pagos, fechas y votos que ya existen. No son métricas en tiempo real inventadas.</p>
      </div>
      <a class="text-link" href="/?board=today">Ver 24h</a>
    </div>
    <div class="trend-grid">
      ${blocks
        .map(([id, title, hint, rows, kind]) => {
          const items = rows
            .slice(0, 4)
            .map((l, i) => {
              let meta = money(l.amount);
              if (kind === "today") meta = `+${money(l.window_amount ?? l.paid_24h ?? 0)}`;
              if (kind === "votes") meta = `${compact((l.love || 0) + (l.hate || 0))} votos`;
              if (kind === "new") meta = ago(l.created_at);
              if (kind === "polar") meta = `${polarizationIndex(l.love, l.hate)}%`;
              return `<li>
                <a href="/creator/${esc(l.slug)}">
                  <span class="mini-rank">${i + 1}</span>
                  ${avatarHtml(l.slug, l.display_name, "avatar sm")}
                  <span class="mini-name">${esc(l.display_name)}</span>
                  <span class="mini-meta">${esc(meta)}</span>
                </a>
              </li>`;
            })
            .join("");
          return `<article class="trend-card ${id}">
            <h3>${esc(title)}</h3>
            <p class="hint">${esc(hint)}</p>
            <ol>${items}</ol>
          </article>`;
        })
        .join("")}
    </div>
  </section>`;
}

export function trustSection() {
  return `<section class="trust" id="como-funciona" aria-labelledby="trust-title">
    <div class="section-head">
      <div>
        <p class="eyebrow">Transparencia</p>
        <h2 id="trust-title">¿Cómo funciona PodioSync?</h2>
      </div>
      <a class="text-link" href="/faq">FAQ</a>
    </div>
    <div class="trust-grid">
      <article>
        <span class="step">01</span>
        <h3>El puesto de pago es el total</h3>
        <p>Entras con un total entero en USD (mínimo $10). Si ya estás, el checkout solo cobra la diferencia. Quitar el #1 exige $5 más que el actual.</p>
      </article>
      <article>
        <span class="step">02</span>
        <h3>Queridos y hate los vota el público</h3>
        <p>Un voto por persona y creador. Puedes cambiar de cariño a hate (o al revés). No se pagan ni se reembolsan votos.</p>
      </article>
      <article>
        <span class="step">03</span>
        <h3>Índice de polarización</h3>
        <p>I = 100 × 2 × min(♥, ✕) / (♥ + ✕). 0% es consenso; 100% es empate de votos. Solo se muestra si hay votos reales.</p>
      </article>
      <article>
        <span class="step">04</span>
        <h3>Pagos verificados</h3>
        <p>Stripe Checkout cobra en USD. El puesto se asigna al confirmar (página de éxito + webhook). Sin clave, esta instalación corre en modo demo.</p>
      </article>
    </div>
  </section>`;
}

export function emptyBoard() {
  return `<div class="empty"><p>Nadie en este tablero todavía.</p></div>`;
}

export function jsonLd(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function themeColorMeta() {
  return `<meta name="theme-color" content="#f5f5f7" media="(prefers-color-scheme: light)"/>
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)"/>`;
}

export function layout({
  title,
  description,
  stats,
  body,
  flash,
  nav = "rank",
  path = "/",
  board = "all",
  listings = [],
  extraHead = "",
}) {
  const origin = siteOrigin();
  const canonical = `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  const desc =
    description ||
    "El ranking vivo de la influencia en España y Latinoamérica. Paga para subir. Vota a los más queridos y a los que más hate tienen.";
  const updated = lastUpdatedIso(listings) || stats?.launched_at;
  const updatedLabel = updated ? `Actualizado ${ago(updated)}` : "";
  const index = creatorsIndex(listings);
  const navClass = (id) => (nav === id ? "on" : "");
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <title>${esc(title)} · PodioSync</title>
  <meta name="description" content="${esc(desc)}"/>
  <link rel="canonical" href="${esc(canonical)}"/>
  <meta property="og:site_name" content="PodioSync"/>
  <meta property="og:locale" content="es_ES"/>
  <meta property="og:title" content="${esc(title)} · PodioSync"/>
  <meta property="og:description" content="${esc(desc)}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="${esc(canonical)}"/>
  <meta property="og:image" content="${esc(origin)}/public/og.jpg"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${esc(title)} · PodioSync"/>
  <meta name="twitter:description" content="${esc(desc)}"/>
  <meta name="twitter:image" content="${esc(origin)}/public/og.jpg"/>
  ${themeColorMeta()}
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="mobile-web-app-capable" content="yes"/>
  <link rel="icon" href="/public/favicon.svg"/>
  <link rel="apple-touch-icon" href="/public/icon.jpg"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"/>
  <link rel="stylesheet" href="/public/styles.css"/>
  <script>
    (function () {
      try {
        var t = localStorage.getItem("ps-theme") || "system";
        document.documentElement.dataset.theme = t;
      } catch (e) {}
    })();
  </script>
  ${extraHead}
</head>
<body data-nav="${esc(nav)}" data-board="${esc(board)}">
  <a class="skip" href="#contenido">Saltar al contenido</a>
  <header>
    <div class="wrap top">
      <a class="wordmark" href="/">Podio<span>Sync</span></a>
      <nav id="site-nav" aria-label="Principal">
        <a class="${navClass("rank")}" href="/">Ranking</a>
        <a class="${navClass("cats")}" href="/categories">Categorías</a>
        <a class="${navClass("trending")}" href="/?board=today">Trending</a>
        <a class="${navClass("love")}" href="/?board=love">Queridos</a>
        <a class="${navClass("hate")}" href="/?board=hate">Hate</a>
        <a class="${navClass("search")}" href="/search" data-search-open>Buscar</a>
        <a class="${navClass("claim")}" href="/claim">Reclamar</a>
      </nav>
      <div class="header-actions">
        <button class="icon-btn" type="button" data-search-open aria-label="Buscar">
          ${iconSearch()}
        </button>
        <button class="icon-btn theme-btn" type="button" data-theme-toggle aria-label="Cambiar tema">
          <span data-theme-label>Sistema</span>
        </button>
        <button class="nav-toggle icon-btn" type="button" aria-expanded="false" aria-controls="site-nav">
          ${iconMenu()}
          <span class="sr-only">Menú</span>
        </button>
      </div>
    </div>
  </header>
  <main class="wrap" id="contenido">
    ${flash ? `<p class="flash" role="status">${esc(flash)}</p>` : ""}
    ${body}
  </main>
  <footer>
    <div class="wrap">
      <div class="foot-brand">
        <a class="wordmark" href="/">Podio<span>Sync</span></a>
        <p>El ranking vivo de la influencia. El puesto de pago es lo que pagas. Queridos y hate los decide el público.</p>
        ${officialSocials()}
      </div>
      <div class="stats">
        <div><b>${num(stats.listings)}</b>creadores</div>
        <div><b>${num(stats.visitors)}</b>visitas</div>
        <div><b>${num(stats.online)}</b>online ahora</div>
      </div>
      <p class="foot-meta">
        ${updatedLabel ? `<span>${esc(updatedLabel)}</span> · ` : ""}
        <a href="/about">About</a> · <a href="/faq">FAQ</a> · <a href="/rules">Reglas</a> · ${esc(stripeBadge())}
      </p>
    </div>
  </footer>
  <nav class="tabbar" aria-label="Navegación móvil">
    <a href="/" class="${nav === "home" || (nav === "rank" && board === "all") ? "on" : ""}">${tabIcon("home")}<span>Inicio</span></a>
    <a href="/#ranking" class="${nav === "rank" ? "on" : ""}">${tabIcon("rank")}<span>Ranking</span></a>
    <a href="/?board=today" class="${nav === "trending" || board === "today" ? "on" : ""}">${tabIcon("trend")}<span>Trending</span></a>
    <a href="/search" data-search-open class="${nav === "search" ? "on" : ""}">${tabIcon("search")}<span>Buscar</span></a>
    <a href="/claim" class="${nav === "claim" ? "on" : ""}">${tabIcon("claim")}<span>Reclamar</span></a>
  </nav>
  <div class="search-layer" id="search-layer" hidden>
    <div class="search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-title">
      <div class="search-head">
        <h2 id="search-title">Buscar influencer</h2>
        <button type="button" class="icon-btn" data-search-close aria-label="Cerrar búsqueda">✕</button>
      </div>
      <label class="search-field">
        <span class="sr-only">Buscar por nombre o @handle</span>
        <input id="search-input" type="search" placeholder="Nombre, @handle o categoría" autocomplete="off" enterkeyhint="search"/>
      </label>
      <p class="hint">Resultados al instante desde el ranking actual. También puedes ir a <a href="/search">/search</a>.</p>
      <ul id="search-results" class="search-results"></ul>
    </div>
  </div>
  <script type="application/json" id="search-index">${JSON.stringify(index)}</script>
  <script src="/public/app.js" defer></script>
</body></html>`;
}

export function claimForm({
  amount,
  category,
  handle,
  displayName,
  tagline,
  description,
  url,
  country,
  platform,
  error,
}) {
  const cats = CATEGORIES.map(
    (c) => `<option value="${c.slug}" ${c.slug === category ? "selected" : ""}>${esc(c.name)}</option>`,
  ).join("");
  const countries = COUNTRIES.map(
    (c) => `<option value="${c.code}" ${c.code === country ? "selected" : ""}>${esc(c.name)}</option>`,
  ).join("");
  const platforms = PLATFORMS.map(
    (p) => `<option value="${p.id}" ${p.id === platform ? "selected" : ""}>${esc(p.name)}</option>`,
  ).join("");
  const total = Number.isFinite(Number(amount)) ? Math.round(Number(amount)) : 10;
  const shown = money(total);
  return `
    <section class="claim-hero">
      <p class="eyebrow">Reclamar puesto</p>
      <h1>¿Eres este creador?</h1>
      <p class="lead">Paga el total que quieres que figure. El ranking no se inventa: el puesto es el dinero. Queridos y hate siguen siendo del público.</p>
    </section>
    <div class="claim-grid">
      <div>
        <p class="muted">${stripeEnabled() ? "El pago se cobra con Stripe Checkout. El puesto se reclama al confirmar." : "Modo demo: el pago se simula. Pon STRIPE_SECRET_KEY para cobrar de verdad."}</p>
        ${error ? `<p class="err" id="claim-error">${esc(error)}</p>` : `<p class="err" id="claim-error" hidden></p>`}
        <form method="post" action="/claim" class="panel claim-form" id="claim-form" novalidate>
          <label>@handle o URL
            <input class="field" name="handle" required minlength="2" maxlength="80" value="${esc(handle || "")}" placeholder="@tuhandle" autocomplete="username"/>
            <span class="hint">Pega el @ o la URL del perfil. No uses el de otra persona.</span>
          </label>
          <label>Nombre
            <input class="field" name="displayName" required maxlength="80" value="${esc(displayName || "")}" placeholder="Cómo se lee en el podio"/>
            <span class="hint">Cómo quieres que se lea en el ranking.</span>
          </label>
          <label>Tagline
            <input class="field" name="tagline" maxlength="80" value="${esc(tagline || "")}" placeholder="Una línea"/>
            <span class="hint">Opcional. Una línea.</span>
          </label>
          <label>Bio corta
            <textarea name="description" rows="3" maxlength="400" placeholder="Quién eres">${esc(description || "")}</textarea>
            <span class="hint">Opcional.</span>
          </label>
          <label>Link público
            <input class="field" name="url" type="text" inputmode="url" maxlength="200" value="${esc(url || "")}" placeholder="instagram.com/…"/>
            <span class="hint">Opcional. Con o sin https://</span>
          </label>
          <div class="row">
            <label>Categoría<select name="category" required>${cats}</select></label>
            <label>País<select name="country">${countries}</select></label>
            <label>Plataforma<select name="platform">${platforms}</select></label>
          </div>
          <label>Total en el ranking
            <div class="step-row">
              <button type="button" class="stepper" data-delta="-1" aria-label="Bajar monto">−</button>
              <input class="field money-input" id="claim-total-view" inputmode="numeric" autocomplete="off" value="${esc(shown)}" aria-label="Total en USD"/>
              <input type="hidden" name="targetTotal" id="claim-total" value="${total}"/>
              <button type="button" class="stepper" data-delta="1" aria-label="Subir monto">+</button>
            </div>
            <span class="hint">USD enteros. El checkout cobra este total (o la diferencia si ya estás).</span>
          </label>
          <button class="btn wide" type="submit">${stripeEnabled() ? "Pagar con Stripe y reclamar" : "Pagar y reclamar el puesto"}</button>
        </form>
      </div>
      <aside class="panel benefits">
        <h2>Qué incluye</h2>
        <ul>
          <li>Ficha pública con foto, @handle y categoría.</li>
          <li>Posición según el total pagado. A igual monto, gana quien llegó primero.</li>
          <li>Si ya estás, solo pagas la diferencia hasta el nuevo total.</li>
          <li>Link de salida medido (/go) hacia tu perfil.</li>
          <li>Los votos de queridos y hate no se compran: los pone la audiencia.</li>
        </ul>
        <p class="hint">Mínimo $10. Quitar el #1: +$5. Máximo $999,999. Pagos finales, sin reembolso.</p>
      </aside>
    </div>
    <script>
      (function () {
        const form = document.getElementById("claim-form");
        const err = document.getElementById("claim-error");
        const total = document.getElementById("claim-total");
        const view = document.getElementById("claim-total-view");
        function show(msg) {
          if (!err) return;
          err.hidden = !msg;
          err.textContent = msg || "";
        }
        function usd(n) {
          return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
        }
        function parseMoney(raw) {
          const digits = String(raw || "").replace(/[^0-9]/g, "");
          if (!digits) return NaN;
          return Number(digits);
        }
        function clamp(n) {
          return Math.max(10, Math.min(999999, Math.round(n)));
        }
        function setAmount(n) {
          const v = Number.isFinite(n) ? clamp(n) : 10;
          if (total) total.value = String(v);
          if (view) view.value = usd(v);
          return v;
        }
        function readAmount() {
          const typed = parseMoney(view && view.value);
          if (Number.isFinite(typed)) return typed;
          const hidden = Number(total && total.value);
          return Number.isFinite(hidden) ? hidden : 10;
        }
        document.querySelectorAll("[data-delta]").forEach((b) => {
          b.addEventListener("click", () => setAmount(readAmount() + Number(b.dataset.delta)));
        });
        if (view) {
          view.addEventListener("blur", () => setAmount(readAmount()));
          view.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setAmount(readAmount());
            }
          });
        }
        if (!form) return;
        form.addEventListener("submit", (e) => {
          const amount = setAmount(readAmount());
          const handle = String(form.handle.value || "").trim();
          const name = String(form.displayName.value || "").trim();
          const category = String(form.category.value || "").trim();
          if (!handle || handle.length < 2) {
            e.preventDefault();
            show("Pon un @handle o URL.");
            form.handle.focus();
            return;
          }
          if (!name) {
            e.preventDefault();
            show("Falta el nombre.");
            form.displayName.focus();
            return;
          }
          if (!category) {
            e.preventDefault();
            show("Elige una categoría.");
            form.category.focus();
            return;
          }
          if (!Number.isFinite(amount) || amount < 10 || amount > 999999 || !Number.isInteger(amount)) {
            e.preventDefault();
            show("El total debe ser un entero entre $10 y $999,999.");
            if (view) view.focus();
          }
        });
      })();
    </script>`;
}

export function sparklineSvg(series, width = 360, height = 120) {
  if (!series || series.length < 2) return "";
  const pad = 8;
  const values = series.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = series
    .map((p, i) => {
      const x = pad + (i / (series.length - 1)) * (width - pad * 2);
      const y = height - pad - ((p.v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Historial de totales pagados">
    <polyline fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
  </svg>`;
}

export function compareBlock(listing, other, { listings = [] } = {}) {
  const options = listings
    .filter((l) => l.slug !== listing.slug)
    .slice(0, 80)
    .map(
      (l) =>
        `<option value="${esc(l.slug)}" ${other && other.slug === l.slug ? "selected" : ""}>${esc(l.display_name)} (${esc(l.handle)})</option>`,
    )
    .join("");
  const form = `<form class="compare-form" method="get" action="/creator/${esc(listing.slug)}">
    <label>Comparar con
      <select name="compare" onchange="this.form.submit()">
        <option value="">Elegir creador…</option>
        ${options}
      </select>
    </label>
  </form>`;
  if (!other) return `<div class="panel compare">${form}<p class="hint">Comparación en el cliente entre fichas que ya están en el ranking. Sin base de datos nueva.</p></div>`;
  const rows = [
    ["Puesto", `#${listing.rank}`, `#${other.rank}`],
    ["Total", money(listing.amount), money(other.amount)],
    ["Queridos", compact(listing.love), compact(other.love)],
    ["Hate", compact(listing.hate), compact(other.hate)],
    [
      "Polarización",
      polarizationIndex(listing.love, listing.hate) == null
        ? "—"
        : `${polarizationIndex(listing.love, listing.hate)}%`,
      polarizationIndex(other.love, other.hate) == null
        ? "—"
        : `${polarizationIndex(other.love, other.hate)}%`,
    ],
  ];
  return `<div class="panel compare">
    ${form}
    <table class="compare-table">
      <thead><tr><th></th><th>${esc(listing.display_name)}</th><th>${esc(other.display_name)}</th></tr></thead>
      <tbody>${rows.map(([k, a, b]) => `<tr><th>${k}</th><td>${a}</td><td>${b}</td></tr>`).join("")}</tbody>
    </table>
  </div>`;
}

export function categoryCards(cats) {
  return `<div class="cat-grid">${cats
    .map((c) => {
      const cover = catCover(c.slug);
      const leader = c.leader
        ? `#1 ${esc(c.leader.name)} · ${money(c.leader.amount)}`
        : "Sin #1 todavía";
      const leaderListing = c.leader
        ? { ...c.leader, display_name: c.leader.name }
        : null;
      return `<article class="cat-card">
        <a href="/category/${c.slug}">
          ${cover ? `<img src="${cover}" alt="" loading="lazy" decoding="async"/>` : `<div class="cat-ph"><span>${esc(catMark(c.slug))}</span></div>`}
          <div class="cat-body">
            <span class="cat-mark">${esc(catMark(c.slug))}</span>
            <strong>${esc(c.name)}</strong>
            <small>${c.count} creador${c.count === 1 ? "" : "es"} · ${leader}</small>
          </div>
        </a>
        ${leaderListing ? compactSocialHtml(leaderListing, "cat-social") : ""}
      </article>`;
    })
    .join("")}</div>`;
}

export { CATEGORY_MAP, COUNTRY_MAP, PLATFORM_MAP, polarizationIndex, polarizationLabel };
