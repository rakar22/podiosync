import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, CATEGORY_MAP } from "./lib/categories.js";
import {
  listBoard,
  getListing,
  getStats,
  bumpVisitor,
  registerClick,
  categorySummaries,
  claimRank,
  claimPriceFor,
  putPending,
  takePending,
  quoteClaim,
  voteOn,
} from "./lib/store.js";
import {
  stripeEnabled,
  stripeMode,
  originFrom,
  createCheckout,
  parseWebhook,
  confirmPaidSession,
  webhookSecret,
  publicPaymentError,
  FULFILL_EVENT_TYPES,
} from "./lib/payments.js";
import {
  creatorsIndex,
  deriveTrending,
  filterRegion,
  parseRegion,
  paymentSeries,
  searchListings,
  withPaid24h,
} from "./lib/insights.js";
import {
  ago,
  avatarHtml,
  categoryCards,
  categoryChips,
  claimForm,
  compareBlock,
  emptyBoard,
  esc,
  jsonLd,
  layout,
  modeTabs,
  money,
  num,
  officialSocials,
  podiumHtml,
  rankArticles,
  regionTabs,
  scoreLabel,
  siteOrigin,
  sparklineSvg,
  trustSection,
  trendingSection,
  voteForms,
  catCover,
  CATEGORY_MAP as CAT_MAP,
  COUNTRY_MAP,
  PLATFORM_MAP,
  polarizationIndex,
} from "./lib/views.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const app = express();

app.set("trust proxy", true);
app.get("/favicon.svg", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "favicon.svg"));
});
app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    stripe: stripeMode(),
    webhook: Boolean(webhookSecret()),
  }),
);
app.get("/robots.txt", (_req, res) => {
  res
    .type("text/plain; charset=utf-8")
    .set("Cache-Control", "public, max-age=300")
    .send(
      `User-agent: *\nAllow: /\nDisallow: /paid\nDisallow: /webhook\nSitemap: ${siteOrigin()}/sitemap.xml\n`,
    );
});
app.get("/sitemap.xml", (_req, res) => {
  const origin = siteOrigin();
  const creators = listBoard("all").map((l) => `/creator/${l.slug}`);
  const urls = ["/", "/categories", "/claim", "/about", "/faq", "/rules", "/search"]
    .concat(CATEGORIES.map((c) => `/category/${c.slug}`))
    .concat(creators);
  res
    .type("application/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${origin}${u}</loc></url>`)
        .join("\n")}\n</urlset>\n`,
    );
});
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripeEnabled()) return res.status(400).json({ error: "Stripe no configurado" });
    if (!webhookSecret()) return res.status(400).json({ error: "Falta STRIPE_WEBHOOK_SECRET" });
    try {
      const event = parseWebhook(req.body, req.headers["stripe-signature"]);
      if (FULFILL_EVENT_TYPES.has(event.type)) {
        const session = event.data.object;
        const result = await confirmPaidSession(session.id, session);
        if (result.waiting) {
          // still unpaid — ignore
        } else if (result.missing) {
          console.warn(`[stripe] session ${session.id} paid but claim payload missing`);
        } else if (!result.ok && result.error) {
          console.warn(`[stripe] session ${session.id}: ${result.error}`);
        }
      }
      res.json({ received: true });
    } catch (err) {
      const msg = String(err.message || err);
      if (/Webhook error|No signatures found|signature/i.test(msg)) {
        return res.status(400).send(`Webhook error: ${msg}`);
      }
      console.warn(`[stripe] webhook failed: ${msg}`);
      return res.status(500).send(`Webhook error: ${msg}`);
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
    res.append(
      "Set-Cookie",
      `psvid=${encodeURIComponent(req.voter)}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`,
    );
  }
  next();
});

function parseBoard(raw) {
  return raw === "today" || raw === "daily" || raw === "love" || raw === "hate" ? raw : "all";
}

function pageNav(board, fallback = "rank") {
  if (board === "love" || board === "hate") return board;
  if (board === "today" || board === "daily") return "trending";
  return fallback;
}

app.get("/api/creators.json", (_req, res) => {
  const listings = listBoard("all");
  res
    .set("Cache-Control", "public, max-age=60")
    .json({ creators: creatorsIndex(listings) });
});

app.get("/", (req, res) => {
  bumpVisitor();
  const board = parseBoard(req.query.board);
  const cat = typeof req.query.cat === "string" ? req.query.cat : "";
  const region = parseRegion(req.query.region);
  const raw = listBoard(board, cat || null);
  const todayRaw = listBoard("today", cat || null);
  const allRaw = board === "all" ? raw : listBoard("all", cat || null);
  const listings = withPaid24h(filterRegion(raw, region), filterRegion(todayRaw, region));
  const stats = getStats();
  const top = listings[0];
  const take = claimPriceFor(top?.window_amount ?? top?.amount ?? 0, true);
  const nav = pageNav(board, "rank");
  const titles = {
    all: "El ranking vivo de la influencia",
    love: "Los más queridos",
    hate: "Los que más hate tienen",
    today: "Lo que se movió en 24 horas",
    daily: "Ranking del día",
  };
  const leads = {
    all: "Cada categoría tiene su propio podio. El puesto de pago es lo que pagas. El cariño y el hate los vota el público.",
    love: "Un voto por persona y creador. Cambia a hate si te arrepientes. Gana quien más corazones suma.",
    hate: "El tablero del drama. No es un pago: es lo que la gente marca. Un voto por persona.",
    today: "Solo cuentan los pagos de las últimas 24 horas. La etiqueta “+$ · 24h” es dinero pagado, no un rank histórico.",
    daily: "El recuento del día UTC.",
  };
  const descs = {
    all: "El ranking público de influencers de España y Latinoamérica. Paga para subir. Vota queridos y hate.",
    love: "Los influencers más queridos de España y LATAM, votados por el público en PodioSync.",
    hate: "El ranking de hate de influencers ES/LATAM. Un voto por persona, sin pagos.",
    today: "Pagos de las últimas 24 horas en el ranking de influencers PodioSync.",
    daily: "Ranking del día UTC en PodioSync.",
  };
  const nextPath =
    "/" +
    [
      board !== "all" ? `board=${encodeURIComponent(board)}` : "",
      cat ? `cat=${encodeURIComponent(cat)}` : "",
      region !== "all" ? `region=${encodeURIComponent(region)}` : "",
    ]
      .filter(Boolean)
      .join("&");
  const path = nextPath === "/" ? "/" : `/?${nextPath.slice(1)}`;
  const cats = categorySummaries().filter((c) => c.count > 0);
  const trending = deriveTrending({
    all: withPaid24h(filterRegion(allRaw, region), filterRegion(todayRaw, region)),
    today: filterRegion(todayRaw, region),
  });
  let boardBody = "";
  if (!listings.length) {
    boardBody = emptyBoard();
  } else if (board === "love" || board === "hate" || board === "today" || board === "daily" || cat) {
    boardBody = `${podiumHtml(listings, board)}${rankArticles(listings.slice(3), board, path)}`;
  } else {
    const groups = CATEGORIES.map((c) => ({
      ...c,
      items: listings.filter((l) => l.category_slug === c.slug).slice(0, 6),
    })).filter((c) => c.items.length);
    boardBody = `${podiumHtml(listings, board)}${groups
      .map((c) => {
        const local = c.items.map((l, i) => ({ ...l, rank: i + 1 }));
        const lead = local[0];
        return `<section class="rail">
          <div class="rail-head">
            <h2>${esc(c.name)}</h2>
            <span class="rail-total">${lead ? `#1 ${money(lead.window_amount ?? lead.amount)}` : ""}</span>
            <a href="/category/${c.slug}">Ver todos</a>
          </div>
          ${rankArticles(local, board, path)}
        </section>`;
      })
      .join("")}`;
  }
  const itemList = jsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: titles[board],
    itemListElement: listings.slice(0, 10).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteOrigin()}/creator/${l.slug}`,
      name: l.display_name,
    })),
  });
  res.type("html").send(
    layout({
      title: titles[board] || "Ranking",
      description: descs[board],
      path,
      stats,
      nav,
      board,
      listings: listBoard("all"),
      extraHead: itemList,
      flash: req.query.ok ? `Listo. Estás en el #${esc(req.query.rank || "")}.` : "",
      body: `
      <section class="hero">
        <div>
          <p class="eyebrow">PodioSync · ES / LATAM</p>
          <h1>${esc(titles[board])}</h1>
          <p class="lead">${esc(leads[board])}</p>
          ${regionTabs(region, { board: board === "all" ? "" : board, cat })}
          <div class="hero-actions">
            <a class="btn" href="#ranking">Explorar ranking</a>
            <a class="btn ghost" href="/search" data-search-open>Buscar influencer</a>
          </div>
        </div>
        <div class="now-card">
          <p class="eyebrow">Ahora mismo</p>
          <p class="name">${top ? `#${top.rank} ${esc(top.display_name)}` : "Sin #1"}</p>
          <p class="muted">${top ? scoreLabel(top, board) : "—"} · ${num(stats.listings)} perfiles</p>
          ${top ? `<p class="hero-actions" style="margin-top:1rem">
            <a class="btn" href="/creator/${esc(top.slug)}">Ver perfil</a>
            ${board === "all" || board === "today" || board === "daily" ? `<a class="btn ghost" href="/claim?amount=${take}">Reclamar #1 por ${money(take)}</a>` : ""}
          </p>` : ""}
        </div>
      </section>
      ${board === "all" && !cat ? trendingSection(trending, board) : ""}
      <div id="ranking">
        ${modeTabs(board, { cat, region })}
        ${categoryChips(cat, { board, region, cats })}
        ${boardBody}
      </div>
      ${board === "love" || board === "hate" ? `<p class="hint" style="margin:1rem 0 2rem">Polarización = 100 × 2 × min(♥,✕) / (♥+✕). 0% consenso, 100% empate de votos.</p>` : ""}
      ${trustSection()}`,
    }),
  );
});

app.get("/search", (req, res) => {
  const stats = getStats();
  const q = String(req.query.q || "").trim();
  const all = listBoard("all");
  const hits = searchListings(all, q);
  const list = (q ? hits : all.slice(0, 12))
    .map(
      (l) => `<li><a href="/creator/${esc(l.slug)}">
        ${avatarHtml(l.slug, l.display_name)}
        <span><strong>${esc(l.display_name)}</strong><br/><span class="muted">${esc(l.handle)}</span></span>
        <span class="muted">${esc(CAT_MAP[l.category_slug]?.name || "")}</span>
      </a></li>`,
    )
    .join("");
  res.type("html").send(
    layout({
      title: q ? `Buscar: ${q}` : "Buscar",
      description: "Busca influencers del ranking PodioSync por nombre, @handle o categoría.",
      path: q ? `/search?q=${encodeURIComponent(q)}` : "/search",
      nav: "search",
      stats,
      listings: all,
      body: `<section class="search-page">
        <p class="eyebrow">Directorio</p>
        <h1>Buscar influencer</h1>
        <p class="lead">Resultados sobre el ranking actual. Sin índice inventado: nombre, @handle y categoría.</p>
        <form class="search-box" method="get" action="/search">
          <label>Nombre o @handle
            <input class="field" id="search-page-input" type="search" name="q" value="${esc(q)}" placeholder="Ibai, @westcol, música…" autofocus/>
          </label>
        </form>
        <ul class="search-results" id="search-page-results">${list || `<li class="muted">${q ? "Sin resultados." : "Escribe para filtrar."}</li>`}</ul>
      </section>`,
    }),
  );
});

app.get("/categories", (_req, res) => {
  const stats = getStats();
  const all = listBoard("all");
  const cats = categorySummaries().filter((c) => c.count > 0);
  res.type("html").send(
    layout({
      title: "Categorías",
      description: "Cada nicho de PodioSync tiene ranking de pago, más queridos y más hate.",
      path: "/categories",
      nav: "cats",
      stats,
      listings: all,
      extraHead: jsonLd({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Categorías · PodioSync",
      }),
      body: `<p class="eyebrow">Nichos</p><h1>Categorías</h1><p class="lead">Cada nicho tiene ranking, queridos y hate. El #1 es el total pagado en esa categoría.</p>${categoryCards(cats)}`,
    }),
  );
});

app.get("/category/:slug", (req, res) => {
  const cat = CATEGORY_MAP[req.params.slug];
  const board = parseBoard(req.query.board);
  const region = parseRegion(req.query.region);
  const todayRaw = listBoard("today", req.params.slug);
  const listings = withPaid24h(
    filterRegion(listBoard(board, req.params.slug), region),
    filterRegion(todayRaw, region),
  );
  const stats = getStats();
  const take = claimPriceFor(listings[0]?.amount ?? 0, true);
  const cover = catCover(req.params.slug);
  const path = `/category/${req.params.slug}${board !== "all" || region !== "all" ? `?${[board !== "all" ? `board=${board}` : "", region !== "all" ? `region=${region}` : ""].filter(Boolean).join("&")}` : ""}`;
  const tabs = [
    ["all", "Ranking"],
    ["love", "Queridos"],
    ["hate", "Hate"],
  ]
    .map(
      ([id, label]) =>
        `<a class="${board === id ? "on" : ""}" href="/category/${esc(req.params.slug)}?board=${id}${region !== "all" ? `&region=${region}` : ""}">${label}</a>`,
    )
    .join("");
  res.type("html").send(
    layout({
      title: cat?.name || req.params.slug,
      description: cat?.blurb || `Ranking de ${req.params.slug} en PodioSync.`,
      path,
      nav: "cats",
      board,
      stats,
      listings: listBoard("all"),
      body: `<p class="muted"><a href="/categories">Categorías</a> / ${esc(cat?.name || req.params.slug)}</p>
        ${cover ? `<img class="cover" src="${cover}" alt="${esc(cat?.name || "")}"/>` : ""}
        <h1>${esc(cat?.name || req.params.slug)}</h1>
        <p class="lead">${esc(cat?.blurb || "")}</p>
        ${regionTabs(region, { board: board === "all" ? "" : board, base: `/category/${req.params.slug}` })}
        <p style="margin-top:1rem"><a class="btn" href="/claim?amount=${take}&category=${esc(req.params.slug)}">Reclamar #1 por ${money(take)}</a></p>
        <div class="modes" style="margin-top:1.2rem">${tabs}</div>
        ${listings.length ? podiumHtml(listings, board) + rankArticles(listings.slice(3), board, path) : emptyBoard()}`,
    }),
  );
});

app.get("/creator/:slug", (req, res) => {
  const found = getListing(req.params.slug);
  const stats = getStats();
  const all = listBoard("all");
  if (!found) {
    return res.status(404).type("html").send(
      layout({
        title: "404",
        stats,
        listings: all,
        body: "<h1>No está en el ranking</h1><p class='lead'>Esa ficha no existe. Prueba el buscador.</p>",
      }),
    );
  }
  const { listing, payments } = found;
  const cat = CAT_MAP[listing.category_slug];
  const price = claimPriceFor(listing.amount, listing.rank === 1);
  const next = `/creator/${listing.slug}`;
  const compareSlug = typeof req.query.compare === "string" ? req.query.compare : "";
  const other = compareSlug && compareSlug !== listing.slug ? getListing(compareSlug)?.listing : null;
  const series = paymentSeries(payments);
  const pays = payments
    .map(
      (p) =>
        `<li style="display:flex;justify-content:space-between"><span class="muted">${ago(p.created_at)}</span><span>${money(p.amount)}</span></li>`,
    )
    .join("");
  const polar = polarizationIndex(listing.love, listing.hate);
  const personLd = jsonLd({
    "@context": "https://schema.org",
    "@type": "Person",
    name: listing.display_name,
    alternateName: listing.handle,
    url: `${siteOrigin()}/creator/${listing.slug}`,
    description: listing.tagline || listing.description,
  });
  res.type("html").send(
    layout({
      title: listing.display_name,
      description: `${listing.display_name} (${listing.handle}) en el ranking PodioSync. #${listing.rank} · ${money(listing.amount)}.`,
      path: `/creator/${listing.slug}`,
      stats,
      listings: all,
      extraHead: personLd,
      body: `<p class="muted"><a href="/">Ranking</a> ${cat ? `/ <a href="/category/${listing.category_slug}">${esc(cat.name)}</a>` : ""}</p>
        <div class="profile">
          <div class="panel">
            <div class="profile-hero">
              ${avatarHtml(listing.slug, listing.display_name, "avatar", { lazy: false })}
              <div>
                <p class="eyebrow">#${listing.rank} · ${money(listing.amount)}</p>
                <h1>${esc(listing.display_name)}</h1>
                <p class="muted">${esc(listing.tagline)}</p>
              </div>
            </div>
            <p style="margin-top:1rem">${esc(listing.description)}</p>
            <p class="muted" style="margin-top:.6rem">${esc(listing.handle)} · ${esc(COUNTRY_MAP[listing.country] || "")} · ${esc(PLATFORM_MAP[listing.platform] || "")}</p>
            <div class="stat-row">
              <div><b>${money(listing.amount)}</b><span>Total pagado</span></div>
              <div><b>♥ ${num(listing.love)}</b><span>Queridos</span></div>
              <div><b>✕ ${num(listing.hate)}</b><span>Hate${polar == null ? "" : ` · pol. ${polar}%`}</span></div>
            </div>
            <div>${voteForms(listing, next)}</div>
            <p style="margin-top:1.1rem;display:flex;flex-wrap:wrap;gap:.5rem">
              ${listing.url ? `<a class="btn ghost" href="/go/${listing.slug}">Abrir perfil</a>` : ""}
              <a class="btn" href="/claim?amount=${price}&category=${listing.category_slug}&handle=${encodeURIComponent(listing.handle)}">Superar por ${money(price)}</a>
            </p>
          </div>
          <div>
            <div class="panel">
              <h2>Pagos</h2>
              <p class="hint">Historial real de cobros de esta ficha. El gráfico suma esos importes en el tiempo.</p>
              ${sparklineSvg(series) || "<p class='muted'>Todavía no hay suficientes pagos para una curva.</p>"}
              <ul class="list">${pays}</ul>
            </div>
            ${compareBlock(listing, other, { listings: all })}
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
      description: "Reclama tu puesto en PodioSync. Stripe Checkout cobra el total (o la diferencia) en USD enteros.",
      path: "/claim",
      nav: "claim",
      stats,
      listings: listBoard("all"),
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
    const result = await confirmPaidSession(sessionId);
    if (result.waiting) {
      return res.type("html").send(
        layout({
          title: "Confirmando pago",
          path: "/paid",
          stats,
          listings: listBoard("all"),
          body: `<h1>Confirmando el pago</h1>
            <p class="muted">Stripe todavía no marcó este pago como cobrado. Recarga en unos segundos.</p>
            <p><a class="btn" href="/paid?session_id=${esc(sessionId)}">Reintentar</a></p>`,
        }),
      );
    }
    if (result.missing) {
      return res.type("html").send(
        layout({
          title: "Pago recibido",
          path: "/paid",
          stats,
          listings: listBoard("all"),
          body: `<h1>Pago recibido</h1>
            <p class="muted">Stripe cobró, pero no encontramos la ficha. Escribe a soporte con el id ${esc(sessionId)}.</p>`,
        }),
      );
    }
    if (!result.ok) {
      return res.type("html").send(
        layout({
          title: "Pago recibido",
          path: "/paid",
          stats,
          listings: listBoard("all"),
          body: `<h1>Pago recibido</h1>
            <p class="err">${esc(result.error)}</p>
            <p class="muted">El cobro está en Stripe. Id ${esc(sessionId)}.</p>
            <p><a class="btn ghost" href="/claim">Volver a reclamar</a></p>`,
        }),
      );
    }
    return res.redirect(303, `/?ok=1&rank=${result.rank}`);
  } catch (err) {
    return res.status(400).type("html").send(
      layout({
        title: "Pago",
        path: "/paid",
        stats,
        listings: listBoard("all"),
        body: `<h1>No se pudo confirmar</h1>
          <p class="err">${esc(publicPaymentError(err))}</p>
          <p><a class="btn" href="/claim">Volver a reclamar</a></p>`,
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
        path: "/claim",
        nav: "claim",
        stats,
        listings: listBoard("all"),
        body: claimForm({ ...req.body, amount: req.body.targetTotal, error: quoted.error }),
      }),
    );
  }
  const payload = quoted.payload;
  if (stripeEnabled()) {
    let claimId = "";
    try {
      const origin = originFrom(req);
      if (!origin) throw new Error("Falta PUBLIC_URL (o el host de la petición).");
      claimId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      putPending(claimId, payload, { charged: quoted.charged });
      const session = await createCheckout({
        claimId,
        payload,
        charged: quoted.charged,
        origin,
      });
      return res.redirect(303, session.url);
    } catch (err) {
      if (claimId) takePending(claimId);
      const stats = getStats();
      return res.status(400).type("html").send(
        layout({
          title: "Reclamar",
          path: "/claim",
          nav: "claim",
          stats,
          listings: listBoard("all"),
          body: claimForm({ ...payload, amount: payload.targetTotal, error: publicPaymentError(err) }),
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
        path: "/claim",
        nav: "claim",
        stats,
        listings: listBoard("all"),
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
      description: "PodioSync es el ranking público de influencers de España y Latinoamérica.",
      path: "/about",
      stats,
      listings: listBoard("all"),
      body: `<article class="page-prose">
        <h1>About</h1>
        <p>podiosync.es es el ranking público de influencers de España y Latinoamérica. Tres tableros: el de pago (el puesto es lo que pagas), los más queridos y los de más hate.</p>
        <p>Las fichas de demostración son perfiles de ejemplo. En producción, cada creator, manager o marca reclama su propio @handle.</p>
        <h2>Síguenos</h2>
        <p>El perfil oficial de PodioSync está en TikTok. Ahí van clips del ranking, queridos y hate.</p>
        ${officialSocials()}
        <div class="stats">
          <div><b>${money(stats.revenue)}</b>ingresos</div>
          <div><b>${num(stats.listings)}</b>creadores</div>
          <div><b>${num(stats.visitors)}</b>visitantes</div>
        </div>
      </article>`,
    }),
  );
});

app.get("/faq", (_req, res) => {
  const stats = getStats();
  res.type("html").send(
    layout({
      title: "FAQ",
      description: "Preguntas frecuentes sobre pagos, votos y tableros de PodioSync.",
      path: "/faq",
      stats,
      listings: listBoard("all"),
      body: `<article class="page-prose">
        <h1>FAQ</h1>
        <h2>¿Cómo funciona?</h2>
        <p>Pegas un @handle, eliges categoría y pagas. Mínimo $10. Quitar el #1 cuesta $5 más que el actual. A igual monto, gana quien llegó primero.</p>
        <h2>¿Más queridos y más hate?</h2>
        <p>Son tableros de voto del público, no de pago. Un voto por persona y creador. Puedes cambiar de querido a hate (o al revés). No hay reembolsos de votos.</p>
        <h2>¿Qué es la polarización?</h2>
        <p>I = 100 × 2 × min(votos ♥, votos ✕) / (♥ + ✕). Cero es consenso; cien es empate. Solo aparece si hay votos.</p>
        <h2>¿All-time, Hoy y Diario?</h2>
        <p>Un pago cuenta en todos los tableros. All-time no caduca. Hoy es 24 h. Diario es el día UTC.</p>
        <h2>¿Hay reembolsos?</h2>
        <p>No. Pagos finales.</p>
        <h2>¿El pago es real?</h2>
        <p>${stripeEnabled() ? "Sí. Stripe Checkout. El puesto se asigna al confirmar el pago (página de éxito + webhook)." : "En esta instalación corre en modo demo. Añade STRIPE_SECRET_KEY para cobrar."}</p>
      </article>`,
    }),
  );
});

app.get("/rules", (_req, res) => {
  const stats = getStats();
  res.type("html").send(
    layout({
      title: "Reglas",
      description: "Reglas del ranking de pago de PodioSync.",
      path: "/rules",
      stats,
      listings: listBoard("all"),
      body: `<article class="page-prose">
        <h1>Reglas</h1>
        <p>PodioSync es un ranking público. El rank es lo que pagas — nada más.</p>
        <ul>
          <li>Fichas nuevas: dólares enteros, mínimo $10, máximo $999,999.</li>
          <li>Quitar el #1: al menos $5 más que el actual.</li>
          <li>A igual monto, se queda arriba quien llegó primero.</li>
          <li>Si ya estás, el checkout solo cobra la diferencia.</li>
          <li>Un @handle es una sola ficha.</li>
        </ul>
      </article>`,
    }),
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`podiosync listening on 0.0.0.0:${PORT}`);
});
