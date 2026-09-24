import { notFound } from "next/navigation";
import CategoryPage from "../../categorias/[slug]/page";
import { prisma } from "@/lib/db";
import { categoryName, isLocale } from "@/lib/i18n";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category || category.group !== "ai") return {};
  return meta(locale, categoryName(locale, category), locale === "en" ? category.descriptionEn : category.descriptionEs, `/ia/${slug}`);
}

export default async function AiChildPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category || category.group !== "ai") notFound();
  return <CategoryPage params={params} />;
}
