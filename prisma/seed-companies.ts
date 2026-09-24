import type { PrismaClient } from "@prisma/client";
import { EDITORIAL_SOURCE, editorialCompanies, websiteHostKey } from "../src/lib/editorial-companies";

function hostOf(value: string | null) {
  if (!value) return null;
  try {
    return websiteHostKey(value);
  } catch {
    return null;
  }
}

export async function seedEditorialCompanies(prisma: PrismaClient) {
  const spain = await prisma.country.findUnique({ where: { code: "ES" } });
  if (!spain) {
    console.log("Sin país ES: no se siembran fichas editoriales.");
    return { created: 0, skipped: editorialCompanies.length };
  }

  const [cities, categories, existing] = await Promise.all([
    prisma.city.findMany({ where: { countryId: spain.id }, select: { id: true, slug: true } }),
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.company.findMany({ select: { slug: true, website: true, sourceUrl: true } }),
  ]);
  const cityBySlug = new Map(cities.map((city) => [city.slug, city.id]));
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const slugs = new Set(existing.map((company) => company.slug));
  const hosts = new Set(
    existing.flatMap((company) => {
      const hostsForCompany = [hostOf(company.website), hostOf(company.sourceUrl)].filter((host): host is string => Boolean(host));
      return hostsForCompany;
    }),
  );

  let created = 0;
  let skipped = 0;

  for (const company of editorialCompanies) {
    const host = websiteHostKey(company.website);
    if (slugs.has(company.slug) || hosts.has(host)) {
      skipped += 1;
      continue;
    }

    const links = company.categorySlugs
      .flatMap((slug) => {
        const categoryId = categoryBySlug.get(slug);
        return categoryId ? [categoryId] : [];
      })
      .map((categoryId, index) => ({ categoryId, isPrimary: index === 0 }));
    if (!links.length) {
      skipped += 1;
      continue;
    }

    const cityId = company.citySlug ? cityBySlug.get(company.citySlug) ?? null : null;

    await prisma.company.create({
      data: {
        name: company.name,
        slug: company.slug,
        website: company.website,
        shortDescription: company.shortDescription,
        countryId: spain.id,
        cityId,
        source: EDITORIAL_SOURCE,
        sourceUrl: company.website,
        verificationStatus: "UNCLAIMED",
        claimed: false,
        isDemo: false,
        categories: { create: links },
      },
    });
    slugs.add(company.slug);
    hosts.add(host);
    created += 1;
  }

  return { created, skipped };
}
