export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return value === "es" || value === "en";
}

export function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export function ui(locale: string) {
  const en = locale === "en";
  return {
    companies: en ? "Companies" : "Empresas",
    rankings: en ? "Rankings" : "Rankings",
    categories: en ? "Categories" : "Categorías",
    countries: en ? "Countries" : "Países",
    cities: en ? "Cities" : "Ciudades",
    technologies: en ? "Technologies" : "Tecnologías",
    pricing: en ? "Pricing" : "Precios",
    forCompanies: en ? "For companies" : "Para empresas",
    ai: en ? "AI" : "IA",
    search: en ? "Search" : "Buscar",
    news: en ? "News" : "Noticias",
    signals: en ? "Signals" : "Señales",
    compare: en ? "Compare" : "Comparar",
    login: en ? "Log in" : "Entrar",
    register: en ? "Create account" : "Crear cuenta",
    dashboard: en ? "Dashboard" : "Panel",
    admin: en ? "Admin" : "Admin",
    logout: en ? "Log out" : "Salir",
    sponsored: en ? "Sponsored" : "Patrocinado",
    organic: en ? "Organic ranking" : "Ranking orgánico",
    verified: en ? "Verified" : "Verificada",
    premium: en ? "Premium" : "Premium",
    claimed: en ? "Claimed" : "Reclamada",
    unavailable: en ? "Currently unavailable" : "Actualmente no disponible",
    seeOther: en ? "See other positions" : "Ver otras posiciones",
    waitlist: en ? "Email me when it is free" : "Avisarme cuando esté libre",
    buy: en ? "Buy this position" : "Comprar esta posición",
    emptyCatalog: en
      ? "No companies are published yet. TECHPODIO does not invent profiles, funding, headcount, or reviews."
      : "Todavía no hay empresas publicadas. TECHPODIO no inventa fichas, financiación, plantillas ni reseñas.",
    claimLine: en
      ? "Discover the companies building Europe’s technology."
      : "Descubre las empresas que están construyendo la tecnología de Europa.",
    menu: en ? "Menu" : "Menú",
    privacy: en ? "Privacy" : "Privacidad",
    terms: en ? "Terms" : "Términos",
    cookies: en ? "Cookies" : "Cookies",
    legal: en ? "Legal notice" : "Aviso legal",
    contact: en ? "Contact" : "Contacto",
    advertising: en ? "Advertising" : "Publicidad",
  };
}

export function positionLabel(locale: string, position: string) {
  const map: Record<string, [string, string]> = {
    RANK_1: ["Posición #1", "Position #1"],
    RANK_2: ["Posición #2", "Position #2"],
    RANK_3: ["Posición #3", "Position #3"],
    TOP_5: ["Top 5", "Top 5"],
    FEATURED: ["Destacada", "Featured"],
    PREMIUM: ["Premium", "Premium"],
  };
  const pair = map[position] || [position, position];
  return locale === "en" ? pair[1] : pair[0];
}

export function categoryName(locale: string, row: { nameEs: string; nameEn: string }) {
  return locale === "en" ? row.nameEn : row.nameEs;
}

export function countryName(locale: string, row: { nameEs: string; nameEn: string }) {
  return locale === "en" ? row.nameEn : row.nameEs;
}
