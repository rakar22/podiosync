export type OrganicInput = {
  id: string;
  name: string;
  verificationStatus: string;
  claimed: boolean;
  website: string | null;
  description: string | null;
  shortDescription: string | null;
  logo: string | null;
  technologyCount: number;
  productCount: number;
  serviceCount: number;
  isDemo: boolean;
};

export function organicScore(company: OrganicInput) {
  let score = 0;
  const factors: string[] = [];
  if (company.verificationStatus === "VERIFIED") {
    score += 40;
    factors.push("verified");
  }
  if (company.claimed) {
    score += 15;
    factors.push("claimed");
  }
  if (company.website) {
    score += 10;
    factors.push("website");
  }
  const desc = `${company.description || ""} ${company.shortDescription || ""}`.trim();
  if (desc.length >= 80) {
    score += 10;
    factors.push("description");
  }
  if (company.logo) {
    score += 5;
    factors.push("logo");
  }
  const tech = Math.min(4, Math.max(0, company.technologyCount));
  if (tech) {
    score += tech * 5;
    factors.push(`technologies:${tech}`);
  }
  const extras = Math.min(3, Math.max(0, company.productCount + company.serviceCount));
  if (extras) {
    score += extras * 3;
    factors.push(`offer:${extras}`);
  }
  return { score, factors };
}

export function rankOrganic<T extends OrganicInput>(companies: T[]) {
  return companies
    .filter((company) => !company.isDemo)
    .map((company) => ({ company, ...organicScore(company) }))
    .sort((a, b) => b.score - a.score || a.company.name.localeCompare(b.company.name, "es"));
}
