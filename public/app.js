(function () {
  const root = document.documentElement;
  const THEMES = ["system", "light", "dark"];
  const LABELS = { system: "Sistema", light: "Claro", dark: "Oscuro" };

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function currentTheme() {
    try {
      return localStorage.getItem("ps-theme") || "system";
    } catch {
      return "system";
    }
  }

  function applyTheme(theme) {
    const next = THEMES.includes(theme) ? theme : "system";
    root.dataset.theme = next;
    try {
      localStorage.setItem("ps-theme", next);
    } catch {
      /* ignore */
    }
    document.querySelectorAll("[data-theme-label]").forEach((el) => {
      el.textContent = LABELS[next];
    });
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-label", `Tema: ${LABELS[next]}. Cambiar`);
    });
  }

  applyTheme(currentTheme());
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = THEMES.indexOf(currentTheme());
      applyTheme(THEMES[(i + 1) % THEMES.length]);
    });
  });

  const navBtn = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  function setNav(on) {
    if (!nav || !navBtn) return;
    nav.classList.toggle("open", on);
    navBtn.setAttribute("aria-expanded", on ? "true" : "false");
    document.body.classList.toggle("nav-open", on);
  }
  if (navBtn && nav) {
    navBtn.addEventListener("click", () => setNav(!nav.classList.contains("open")));
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setNav(false)));
  }

  const layer = document.getElementById("search-layer");
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const indexEl = document.getElementById("search-index");
  let index = [];
  try {
    index = JSON.parse(indexEl ? indexEl.textContent : "[]");
  } catch {
    index = [];
  }

  function renderHits(q) {
    if (!results) return;
    const needle = String(q || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    if (!needle) {
      results.innerHTML = "";
      return;
    }
    const hits = index
      .filter((c) => {
        const n = String(c.n || "").toLowerCase();
        const h = String(c.h || "")
          .toLowerCase()
          .replace(/^@/, "");
        const s = String(c.s || "").toLowerCase();
        const cat = String(c.c || "").toLowerCase();
        return n.includes(needle) || h.includes(needle) || s.includes(needle) || cat.includes(needle);
      })
      .slice(0, 8);
    if (!hits.length) {
      results.innerHTML = `<li class="muted" style="padding:.6rem">Sin resultados para “${escapeHtml(needle)}”.</li>`;
      return;
    }
    results.innerHTML = hits
      .map(
        (c) =>
          `<li><a href="/creator/${encodeURIComponent(c.s)}"><span class="avatar fallback sm">${escapeHtml(String(c.n || "?").slice(0, 2).toUpperCase())}</span><span><strong>${escapeHtml(c.n)}</strong><br/><span class="muted">${escapeHtml(c.h)}${c.c ? " · " + escapeHtml(c.c) : ""}</span></span></a></li>`,
      )
      .join("");
  }

  function openSearch(e) {
    if (e) e.preventDefault();
    if (!layer) {
      window.location.href = "/search";
      return;
    }
    layer.hidden = false;
    setNav(false);
    if (input) {
      input.value = "";
      renderHits("");
      input.focus();
    }
  }

  function closeSearch() {
    if (layer) layer.hidden = true;
  }

  document.querySelectorAll("[data-search-open]").forEach((el) => {
    el.addEventListener("click", openSearch);
  });
  document.querySelectorAll("[data-search-close]").forEach((el) => {
    el.addEventListener("click", closeSearch);
  });
  if (layer) {
    layer.addEventListener("click", (e) => {
      if (e.target === layer) closeSearch();
    });
  }
  if (input) input.addEventListener("input", () => renderHits(input.value));

  const pageInput = document.getElementById("search-page-input");
  const pageResults = document.getElementById("search-page-results");
  if (pageInput && pageResults) {
    pageInput.addEventListener("input", () => {
      const q = pageInput.value;
      if (!q.trim()) return;
      const url = new URL(window.location.href);
      url.searchParams.set("q", q);
      history.replaceState({}, "", url);
      renderInto(pageResults, q);
    });
  }

  function renderInto(target, q) {
    const needle = String(q || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    const hits = index.filter((c) => {
      const n = String(c.n || "").toLowerCase();
      const h = String(c.h || "")
        .toLowerCase()
        .replace(/^@/, "");
      const s = String(c.s || "").toLowerCase();
      const cat = String(c.c || "").toLowerCase();
      return n.includes(needle) || h.includes(needle) || s.includes(needle) || cat.includes(needle);
    });
    target.innerHTML = hits
      .slice(0, 40)
      .map(
        (c) =>
          `<li><a href="/creator/${encodeURIComponent(c.s)}"><span class="avatar fallback">${escapeHtml(String(c.n || "?").slice(0, 2).toUpperCase())}</span><span><strong>${escapeHtml(c.n)}</strong><br/><span class="muted">${escapeHtml(c.h)}</span></span><span class="muted">${escapeHtml(c.c || "")}</span></a></li>`,
      )
      .join("") || `<li class="muted">Sin resultados.</li>`;
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSearch();
      setNav(false);
    }
    if (e.key === "/" && !/input|textarea|select/i.test(e.target.tagName)) {
      e.preventDefault();
      openSearch();
    }
  });
})();
