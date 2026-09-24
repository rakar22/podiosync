import { categoryName, countryName } from "./i18n";

type CompanyLike = {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  description: string | null;
  shortDescription: string | null;
  website: string | null;
  logo: string | null;
  region: string | null;
  foundedYear: number | null;
  employeeRange: string | null;
  businessModel: string | null;
  contactPublic: string | null;
  verificationStatus: string;
  claimed: boolean;
  premium: boolean;
  isDemo: boolean;
  source: string | null;
  sourceUrl: string | null;
  country?: { slug: string; code: string; nameEs: string; nameEn: string } | null;
  city?: { slug: string; name: string } | null;
  categories?: { isPrimary?: boolean; category: { slug: string; nameEs: string; nameEn: string } }[];
  technologies?: { technology: { slug: string; name: string } }[];
  industries?: { industry: { slug: string; nameEs: string; nameEn: string } }[];
  products?: { name: string; description: string | null }[];
  services?: { name: string; description: string | null }[];
  socialLinks?: { platform: string; url: string }[];
};

export function toPublicCompany(company: CompanyLike, locale = "es") {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    legalName: company.legalName,
    description: company.description,
    shortDescription: company.shortDescription,
    website: company.website,
    logo: company.logo,
    region: company.region,
    foundedYear: company.foundedYear,
    employeeRange: company.employeeRange,
    businessModel: company.businessModel,
    contactPublic: company.contactPublic,
    verificationStatus: company.verificationStatus,
    claimed: company.claimed,
    premium: company.premium,
    isDemo: company.isDemo,
    source: company.source,
    sourceUrl: company.sourceUrl,
    country: company.country ? { slug: company.country.slug, code: company.country.code, name: countryName(locale, company.country) } : null,
    city: company.city ? { slug: company.city.slug, name: company.city.name } : null,
    categories: (company.categories || []).map((item) => ({ slug: item.category.slug, name: categoryName(locale, item.category), primary: Boolean(item.isPrimary) })),
    technologies: (company.technologies || []).map((item) => ({ slug: item.technology.slug, name: item.technology.name })),
    industries: (company.industries || []).map((item) => ({ slug: item.industry.slug, name: locale === "en" ? item.industry.nameEn : item.industry.nameEs })),
    products: company.products || [],
    services: company.services || [],
    socialLinks: company.socialLinks || [],
  };
}
