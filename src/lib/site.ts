function clean(value: string | undefined) {
  return value?.trim() || "";
}

export function siteName() {
  return clean(process.env.SITE_NAME) || "TECHPODIO";
}

export function siteUrl() {
  return (clean(process.env.SITE_URL) || clean(process.env.PUBLIC_URL) || clean(process.env.NEXTAUTH_URL) || "http://localhost:3000").replace(/\/$/, "");
}

export function publicOrigin() {
  return siteUrl();
}

export function siteClaim(locale: string) {
  if (locale === "en") {
    return clean(process.env.SITE_CLAIM_EN) || "Discover the companies building Europe’s technology.";
  }
  return clean(process.env.SITE_CLAIM) || "Descubre las empresas que están construyendo la tecnología de Europa.";
}

export function legalIdentity() {
  const name = clean(process.env.LEGAL_ENTITY_NAME);
  const taxId = clean(process.env.LEGAL_TAX_ID);
  const address = clean(process.env.LEGAL_ADDRESS);
  const email = clean(process.env.LEGAL_EMAIL) || clean(process.env.CONTACT_EMAIL) || "podio@podiosync.es";
  const jurisdiction = clean(process.env.LEGAL_JURISDICTION);
  return {
    name,
    taxId,
    address,
    email,
    jurisdiction,
    configured: Boolean(name && taxId && address),
  };
}

export const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const;

export const SIGNAL_KINDS = ["product", "hiring", "regulation", "partnership", "open-source", "other"] as const;
