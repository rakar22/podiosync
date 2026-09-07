export const CATEGORIES = [
  {
    slug: "streaming",
    name: "Streaming & Twitch",
    blurb: "IRL, just chatting, eventos y kings of live.",
  },
  {
    slug: "tiktok",
    name: "TikTok",
    blurb: "Shorts que rompen, sonidos y for you page.",
  },
  {
    slug: "youtube",
    name: "YouTube",
    blurb: "Canales largos, vlogs y series que se bingean.",
  },
  {
    slug: "instagram",
    name: "Instagram",
    blurb: "Feed, reels y collabs de marca.",
  },
  {
    slug: "gaming",
    name: "Gaming",
    blurb: "FPS, mobile, speedruns y creators de esports.",
  },
  {
    slug: "humor",
    name: "Humor & Sketch",
    blurb: "Comedia, sketches, stand-up y caos controlado.",
  },
  {
    slug: "belleza",
    name: "Belleza & Makeup",
    blurb: "Glow, skincare, GRWM y tutoriales.",
  },
  {
    slug: "fitness",
    name: "Fitness & Salud",
    blurb: "Gym, running, recetas y coaches.",
  },
  {
    slug: "musica",
    name: "Música",
    blurb: "Artistas, DJs, covers y el underground latino.",
  },
  {
    slug: "gastro",
    name: "Gastronomía",
    blurb: "Chefs, street food, recetas de casa.",
  },
  {
    slug: "moda",
    name: "Moda",
    blurb: "Looks, thrift, pasarela y drop culture.",
  },
  {
    slug: "viajes",
    name: "Viajes",
    blurb: "Mochileros, city guides y digital nomads.",
  },
  {
    slug: "finanzas",
    name: "Finanzas & Crypto",
    blurb: "Educación financiera, brokers y web3 en español.",
  },
  {
    slug: "deportes",
    name: "Deportes",
    blurb: "Fútbol, F1, ufc y pódcasts de vestuario.",
  },
  {
    slug: "lifestyle",
    name: "Lifestyle",
    blurb: "Día a día, homes, cars y soft life.",
  },
  {
    slug: "educacion",
    name: "Educación",
    blurb: "Idiomas, oposiciones, uni y skill-sharing.",
  },
  {
    slug: "noticias",
    name: "Actualidad",
    blurb: "Comentaristas, periodismo creator y política.",
  },
  {
    slug: "podcast",
    name: "Podcast",
    blurb: "Late nights, entrevistas y mesas en español.",
  },
  {
    slug: "baile",
    name: "Baile",
    blurb: "Coreografías, perreo, urban y challenges.",
  },
  {
    slug: "tech",
    name: "Tech & Gadgets",
    blurb: "Reviews, setups, IA y builders.",
  },
  {
    slug: "familia",
    name: "Familia & Parenting",
    blurb: "Moms, dads y el caos hermoso de criar.",
  },
  {
    slug: "agencias",
    name: "Agencias & Talent",
    blurb: "Managers, MCNs y las oficinas que mueven el roster.",
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);

export const COUNTRIES = [
  { code: "ES", name: "España" },
  { code: "MX", name: "México" },
  { code: "AR", name: "Argentina" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Perú" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
  { code: "DO", name: "República Dominicana" },
  { code: "EC", name: "Ecuador" },
  { code: "GT", name: "Guatemala" },
  { code: "PA", name: "Panamá" },
  { code: "CR", name: "Costa Rica" },
  { code: "PR", name: "Puerto Rico" },
  { code: "SV", name: "El Salvador" },
  { code: "US", name: "USA / Latine" },
  { code: "BR", name: "Brasil" },
];

export const COUNTRY_MAP = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c.name]),
);

export const PLATFORMS = [
  { id: "instagram", name: "Instagram" },
  { id: "tiktok", name: "TikTok" },
  { id: "youtube", name: "YouTube" },
  { id: "twitch", name: "Twitch" },
  { id: "kick", name: "Kick" },
  { id: "x", name: "X" },
];

export const PLATFORM_MAP = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p.name]),
);

export const MIN_NEW = 10;
export const MAX_BID = 999_999;
export const TAKE_FIRST_DELTA = 5;
export const TAKE_OTHER_DELTA = 1;
