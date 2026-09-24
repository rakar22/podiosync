import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { publicOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicOrigin();
  const [categories, countries, cities, technologies, companies] = await Promise.all([
    prisma.category.findMany({ select: { slug: true, group: true } }),
    prisma.country.findMany({ select: { slug: true } }),
    prisma.city.findMany({ select: { slug: true, country: { select: { slug: true } } } }),
    prisma.technology.findMany({ select: { slug: true } }),
    prisma.company.findMany({ where: { isDemo: false }, select: { slug: true, updatedAt: true } }),
  ]);
  const paths = new Set<string>([
    "",
    "/empresas",
    "/categorias",
    "/paises",
    "/ciudades",
    "/tecnologias",
    "/rankings",
    "/ia",
    "/comparar",
    "/noticias",
    "/senales",
    "/precios",
    "/para-empresas",
    "/buscar",
    "/privacidad",
    "/terminos",
    "/cookies",
    "/aviso-legal",
    "/contacto",
  ]);
  for (const category of categories) {
    paths.add(`/categorias/${category.slug}`);
    paths.add(`/rankings/${category.slug}`);
    if (category.group === "ai" && category.slug !== "artificial-intelligence") paths.add(`/ia/${category.slug}`);
    for (const country of countries) {
      paths.add(`/empresas/${category.slug}/${country.slug}`);
      paths.add(`/rankings/${category.slug}/${country.slug}`);
    }
    for (const city of cities) {
      paths.add(`/empresas/${category.slug}/${city.slug}`);
      paths.add(`/rankings/${category.slug}/${city.country.slug}/${city.slug}`);
    }
  }
  for (const country of countries) paths.add(`/paises/${country.slug}`);
  for (const city of cities) paths.add(`/ciudades/${city.slug}`);
  for (const technology of technologies) paths.add(`/tecnologias/${technology.slug}`);
  for (const company of companies) paths.add(`/empresa/${company.slug}`);

  const entries: MetadataRoute.Sitemap = [];
  for (const path of paths) {
    entries.push({
      url: `${base}/es${path}`,
      alternates: { languages: { es: `${base}/es${path}`, en: `${base}/en${path}`, "x-default": `${base}/es${path}` } },
    });
    entries.push({
      url: `${base}/en${path}`,
      alternates: { languages: { es: `${base}/es${path}`, en: `${base}/en${path}`, "x-default": `${base}/es${path}` } },
    });
  }
  return entries;
}
