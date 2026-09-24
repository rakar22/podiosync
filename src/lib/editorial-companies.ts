/**
 * Editorial directory profiles for a fresh install.
 * Public website fields only: no tax IDs, funding, headcount, or revenue.
 * Domestika is omitted: its public about page lists Berkeley as HQ.
 * Perk is the public name of the company formerly presented as TravelPerk.
 */

export const EDITORIAL_SOURCE = "editorial-directory";

export type EditorialCompany = {
  name: string;
  slug: string;
  website: string;
  shortDescription: string;
  /** Seeded city slug. Null when the public city is not in the city seed. */
  citySlug: string | null;
  categorySlugs: readonly string[];
};

function editorialSummary(name: string, activity: string) {
  return `Ficha editorial del directorio a partir del sitio público de ${name}. ${activity} No incluye métricas ni datos que ese sitio no publique.`;
}

export const editorialCompanies: readonly EditorialCompany[] = [
  {
    name: "Factorial",
    slug: "factorial",
    website: "https://factorial.com",
    shortDescription: editorialSummary("Factorial", "Software de recursos humanos para empresas."),
    citySlug: "barcelona",
    categorySlugs: ["hrtech", "saas"],
  },
  {
    name: "Typeform",
    slug: "typeform",
    website: "https://www.typeform.com",
    shortDescription: editorialSummary("Typeform", "Herramienta para crear formularios y encuestas."),
    citySlug: "barcelona",
    categorySlugs: ["saas", "productivity"],
  },
  {
    name: "Perk",
    slug: "perk",
    website: "https://www.perk.com",
    shortDescription: editorialSummary("Perk", "Plataforma de viajes y gastos de empresa."),
    citySlug: "barcelona",
    categorySlugs: ["traveltech", "saas"],
  },
  {
    name: "Glovo",
    slug: "glovo",
    website: "https://glovoapp.com",
    shortDescription: editorialSummary("Glovo", "Plataforma de entrega a domicilio."),
    citySlug: "barcelona",
    categorySlugs: ["logistics", "foodtech"],
  },
  {
    name: "Wallbox",
    slug: "wallbox",
    website: "https://wallbox.com",
    shortDescription: editorialSummary("Wallbox", "Cargadores y software para vehículo eléctrico."),
    citySlug: "barcelona",
    categorySlugs: ["energy", "mobility"],
  },
  {
    name: "Holded",
    slug: "holded",
    website: "https://www.holded.com",
    shortDescription: editorialSummary("Holded", "Software de gestión para pequeñas empresas."),
    citySlug: "barcelona",
    categorySlugs: ["saas"],
  },
  {
    name: "Cabify",
    slug: "cabify",
    website: "https://cabify.com",
    shortDescription: editorialSummary("Cabify", "Plataforma de movilidad de personas."),
    citySlug: "madrid",
    categorySlugs: ["mobility"],
  },
  {
    name: "Jobandtalent",
    slug: "jobandtalent",
    website: "https://www.jobandtalent.com",
    shortDescription: editorialSummary("Jobandtalent", "Plataforma de empleo y trabajo temporal."),
    citySlug: "madrid",
    categorySlugs: ["hrtech"],
  },
  {
    name: "Fever",
    slug: "fever",
    website: "https://feverup.com",
    shortDescription: editorialSummary("Fever", "Plataforma para descubrir y reservar eventos."),
    citySlug: "madrid",
    categorySlugs: ["ecommerce"],
  },
  {
    name: "Wallapop",
    slug: "wallapop",
    website: "https://www.wallapop.com",
    shortDescription: editorialSummary("Wallapop", "Mercado de segunda mano entre particulares."),
    citySlug: "barcelona",
    categorySlugs: ["ecommerce"],
  },
  {
    name: "Genially",
    slug: "genially",
    website: "https://genially.com",
    shortDescription: editorialSummary("Genially", "Herramienta para crear contenidos interactivos."),
    citySlug: "cordoba",
    categorySlugs: ["content-tools", "edtech"],
  },
  {
    name: "Idealista",
    slug: "idealista",
    website: "https://www.idealista.com",
    shortDescription: editorialSummary("Idealista", "Portal inmobiliario."),
    citySlug: "madrid",
    categorySlugs: ["proptech"],
  },
  {
    name: "Softonic",
    slug: "softonic",
    website: "https://www.softonic.com",
    shortDescription: editorialSummary("Softonic", "Directorio de descarga de software."),
    citySlug: "barcelona",
    categorySlugs: ["content-tools"],
  },
  {
    name: "Seedtag",
    slug: "seedtag",
    website: "https://www.seedtag.com",
    shortDescription: editorialSummary("Seedtag", "Publicidad contextual."),
    citySlug: "madrid",
    categorySlugs: ["martech"],
  },
  {
    name: "Clarity AI",
    slug: "clarity-ai",
    website: "https://clarity.ai",
    shortDescription: editorialSummary("Clarity AI", "Software de análisis de sostenibilidad."),
    citySlug: "madrid",
    categorySlugs: ["sustainability-software", "data-analytics"],
  },
  {
    name: "Multiverse Computing",
    slug: "multiverse-computing",
    website: "https://multiversecomputing.com",
    shortDescription: editorialSummary("Multiverse Computing", "Software de computación cuántica."),
    citySlug: "san-sebastian",
    categorySlugs: ["quantum", "deep-tech"],
  },
  {
    name: "Paack",
    slug: "paack",
    website: "https://paack.co",
    shortDescription: editorialSummary("Paack", "Entrega de paquetería para comercio electrónico."),
    citySlug: "barcelona",
    categorySlugs: ["logistics"],
  },
  {
    name: "Sngular",
    slug: "sngular",
    website: "https://www.sngular.com",
    shortDescription: editorialSummary("Sngular", "Compañía de servicios de software."),
    citySlug: "madrid",
    categorySlugs: ["devtools"],
  },
  {
    // Public headquarters are in Tres Cantos, which is not a seeded city.
    name: "GMV",
    slug: "gmv",
    website: "https://www.gmv.com",
    shortDescription: editorialSummary("GMV", "Tecnología para espacio, defensa y sistemas."),
    citySlug: null,
    categorySlugs: ["spacetech", "defense-tech"],
  },
  {
    name: "Devo",
    slug: "devo",
    website: "https://www.devo.com",
    shortDescription: editorialSummary("Devo", "Plataforma de datos de seguridad."),
    citySlug: "madrid",
    categorySlugs: ["cybersecurity", "data-analytics"],
  },
  {
    name: "Stratio",
    slug: "stratio",
    website: "https://stratio.ai",
    shortDescription: editorialSummary("Stratio", "Software de datos e inteligencia artificial para empresas."),
    citySlug: "madrid",
    categorySlugs: ["data-analytics", "artificial-intelligence"],
  },
  {
    name: "Plain Concepts",
    slug: "plain-concepts",
    website: "https://www.plainconcepts.com",
    shortDescription: editorialSummary("Plain Concepts", "Compañía de servicios de software."),
    citySlug: "madrid",
    categorySlugs: ["devtools"],
  },
  {
    name: "InfoJobs",
    slug: "infojobs",
    website: "https://www.infojobs.net",
    shortDescription: editorialSummary("InfoJobs", "Portal de empleo."),
    citySlug: "barcelona",
    categorySlugs: ["hrtech"],
  },
];

export function websiteHostKey(website: string) {
  return new URL(website).hostname.toLowerCase().replace(/^www\./, "");
}
