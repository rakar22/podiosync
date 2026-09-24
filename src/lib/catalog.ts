import { prisma } from "./db";
import { rankOrganic, type OrganicInput } from "./organic";
import { POSITION_KEYS, resolvePrice, slotAvailability, type PriceCandidate, type SlotView } from "./positions";
import { runMaintenance } from "./maintenance";

export const companyInclude = {
  country: true,
  city: true,
  categories: { include: { category: true } },
  technologies: { include: { technology: true } },
  industries: { include: { industry: true } },
  products: true,
  services: true,
  socialLinks: true,
} as const;

export async function listCategories() {
  return prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEs: "asc" }], include: { children: true, parent: true } });
}

export async function listCountries() {
  return prisma.country.findMany({ orderBy: { nameEs: "asc" }, include: { cities: { orderBy: { name: "asc" } } } });
}

export async function listCities() {
  return prisma.city.findMany({ orderBy: { name: "asc" }, include: { country: true } });
}

export async function listTechnologies() {
  return prisma.technology.findMany({ orderBy: { name: "asc" } });
}

export async function listIndustries() {
  return prisma.industry.findMany({ orderBy: { nameEs: "asc" } });
}

export async function activeRules(): Promise<PriceCandidate[]> {
  const rules = await prisma.pricingRule.findMany({ where: { active: true } });
  return rules.map((rule) => ({
    id: rule.id,
    position: rule.position,
    categoryId: rule.categoryId,
    countryId: rule.countryId,
    cityId: rule.cityId,
    durationDays: rule.durationDays,
    priceCents: rule.priceCents,
    currency: rule.currency,
    active: rule.active,
    example: rule.example,
  }));
}

function toOrganic(company: {
  id: string;
  name: string;
  verificationStatus: string;
  claimed: boolean;
  website: string | null;
  description: string | null;
  shortDescription: string | null;
  logo: string | null;
  isDemo: boolean;
  technologies: unknown[];
  products: unknown[];
  services: unknown[];
}): OrganicInput {
  return {
    id: company.id,
    name: company.name,
    verificationStatus: company.verificationStatus,
    claimed: company.claimed,
    website: company.website,
    description: company.description,
    shortDescription: company.shortDescription,
    logo: company.logo,
    technologyCount: company.technologies.length,
    productCount: company.products.length,
    serviceCount: company.services.length,
    isDemo: company.isDemo,
  };
}

export async function loadBoard(input: { categoryId: string; countryId: string; cityId: string | null }) {
  await runMaintenance();
  const now = new Date();
  const [slots, rules, companies] = await Promise.all([
    prisma.sponsoredPosition.findMany({
      where: { categoryId: input.categoryId, countryId: input.countryId, cityId: input.cityId },
      include: {
        company: { include: companyInclude },
        category: true,
        country: true,
        city: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    activeRules(),
    prisma.company.findMany({
      where: {
        isDemo: false,
        categories: { some: { categoryId: input.categoryId } },
        ...(input.cityId ? { cityId: input.cityId } : { countryId: input.countryId }),
      },
      include: companyInclude,
    }),
  ]);

  const sponsored = POSITION_KEYS.map((position) => {
    const related = slots.filter((slot) => slot.position === position);
    const views: SlotView[] = related.map((slot) => ({
      id: slot.id,
      status: slot.status,
      companyId: slot.companyId,
      endDate: slot.endDate,
      holdUntil: slot.holdUntil,
    }));
    const availability = slotAvailability(views, now);
    const active = related.find((slot) => slot.status === "ACTIVE" && slot.endDate && slot.endDate > now) || null;
    const price = resolvePrice(rules, {
      position,
      categoryId: input.categoryId,
      countryId: input.countryId,
      cityId: input.cityId,
      durationDays: 30,
    });
    return { position, active, availability, price30: price };
  });

  const taken = new Set(sponsored.map((row) => row.active?.companyId).filter(Boolean) as string[]);
  const organic = rankOrganic(companies.filter((company) => !taken.has(company.id)).map((company) => ({ ...company, ...toOrganic(company) })));

  const countryKey = input.countryId;
  const cityKey = input.cityId || "";
  if (organic.length <= 500) {
    await prisma.ranking.deleteMany({
      where: { categoryId: input.categoryId, countryKey, cityKey, kind: "organic" },
    });
    if (organic.length) {
      await prisma.ranking.createMany({
        data: organic.map((row) => ({
          companyId: row.company.id,
          categoryId: input.categoryId,
          countryKey,
          cityKey,
          score: row.score,
          factors: row.factors.join(","),
          kind: "organic",
        })),
      });
    }
  }

  return { sponsored, organic, slots };
}

export async function searchCompanies(input: {
  q?: string;
  categorySlug?: string;
  countrySlug?: string;
  citySlug?: string;
  technologySlug?: string;
  verified?: boolean;
  skip: number;
  take: number;
}) {
  const q = input.q?.trim();
  const where = {
    isDemo: false,
    ...(input.verified ? { verificationStatus: "VERIFIED" } : {}),
    ...(input.categorySlug ? { categories: { some: { category: { slug: input.categorySlug } } } } : {}),
    ...(input.countrySlug ? { country: { slug: input.countrySlug } } : {}),
    ...(input.citySlug ? { city: { slug: input.citySlug } } : {}),
    ...(input.technologySlug ? { technologies: { some: { technology: { slug: input.technologySlug } } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { shortDescription: { contains: q } },
            { description: { contains: q } },
            { slug: { contains: q } },
            { categories: { some: { category: { OR: [{ nameEs: { contains: q } }, { nameEn: { contains: q } }] } } } },
            { technologies: { some: { technology: { name: { contains: q } } } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({ where, include: companyInclude, orderBy: { name: "asc" }, skip: input.skip, take: input.take }),
  ]);
  return { total, rows };
}
