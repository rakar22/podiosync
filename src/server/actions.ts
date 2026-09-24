"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clearSession, currentUser, hashPassword, signSession, verifyPassword } from "@/lib/auth";
import { audit, trackEvent } from "@/lib/audit";
import { startPurchase } from "@/lib/checkout";
import { publicPaymentError } from "@/lib/stripe";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isPosition, validatePricingInput } from "@/lib/positions";
import { slugify } from "@/lib/slug";
import { EMPLOYEE_RANGES } from "@/lib/site";
import { safeNext } from "@/lib/locale";

function redirectError(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest || "").includes("NEXT_REDIRECT");
}

async function localeOf(formData?: FormData) {
  const fromForm = String(formData?.get("locale") || "");
  if (fromForm === "en" || fromForm === "es") return fromForm;
  const headerStore = await headers();
  return headerStore.get("x-locale") === "en" ? "en" : "es";
}

async function ip() {
  const headerStore = await headers();
  return clientIp(headerStore.get("x-forwarded-for"));
}

function honeypot(formData: FormData) {
  return String(formData.get("website_hp") || "").trim().length > 0;
}

async function requireUser() {
  const user = await currentUser();
  if (!user) redirect(`/${await localeOf()}/login`);
  return user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect(`/${await localeOf()}/`);
  return user;
}

async function memberOrAdmin(user: { id: string; role: string }, companyId: string) {
  if (user.role === "ADMIN") return;
  const member = await prisma.companyMember.findUnique({ where: { userId_companyId: { userId: user.id, companyId } } });
  if (!member) throw new Error("FORBIDDEN");
}

const emailSchema = z.string().trim().email().max(180);

export async function register(formData: FormData) {
  const locale = await localeOf(formData);
  const parsed = z.object({
    email: emailSchema,
    password: z.string().min(10).max(200),
    name: z.string().trim().max(80).optional(),
  }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: String(formData.get("name") || "") || undefined,
  });
  if (!parsed.success) redirect(`/${locale}/register?error=invalid`);
  if (!(await rateLimit(`register:${await ip()}`, 8, 60 * 60 * 1000))) redirect(`/${locale}/register?error=rate`);
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect(`/${locale}/register?error=exists`);
  const user = await prisma.user.create({
    data: { email, passwordHash: hashPassword(parsed.data.password), name: parsed.data.name || null, locale },
  });
  await audit("user.register", "User", user.id, user.id);
  await signSession(user.id);
  redirect(safeNext(String(formData.get("next") || ""), locale));
}

export async function login(formData: FormData) {
  const locale = await localeOf(formData);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!(await rateLimit(`login:${await ip()}`, 12, 15 * 60 * 1000))) redirect(`/${locale}/login?error=rate`);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) redirect(`/${locale}/login?error=credentials`);
  await audit("user.login", "User", user.id, user.id);
  await signSession(user.id);
  redirect(safeNext(String(formData.get("next") || ""), locale));
}

export async function logout() {
  const locale = await localeOf();
  await clearSession();
  redirect(`/${locale}/`);
}

export async function deleteAccount(formData: FormData) {
  const locale = await localeOf(formData);
  const user = await requireUser();
  const active = await prisma.campaign.count({ where: { userId: user.id, status: "ACTIVE" } });
  if (active) redirect(`/${locale}/dashboard/configuracion?error=active`);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: `deleted-${user.id}@invalid.local`,
      name: null,
      passwordHash: hashPassword(crypto.randomUUID()),
      role: "USER",
    },
  });
  await prisma.companyMember.deleteMany({ where: { userId: user.id } });
  await prisma.favorite.deleteMany({ where: { userId: user.id } });
  await audit("user.delete", "User", user.id, user.id);
  await clearSession();
  redirect(`/${locale}/`);
}

export async function startCheckout(formData: FormData) {
  const locale = await localeOf(formData);
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/comprar`);
  const back = new URLSearchParams({
    categoryId: String(formData.get("categoryId") || ""),
    countryId: String(formData.get("countryId") || ""),
    cityId: String(formData.get("cityId") || ""),
    position: String(formData.get("position") || ""),
  });
  try {
    const url = await startPurchase({
      userId: user.id,
      locale,
      categoryId: String(formData.get("categoryId") || ""),
      countryId: String(formData.get("countryId") || ""),
      cityId: String(formData.get("cityId") || "") || null,
      position: String(formData.get("position") || ""),
      durationDays: Number(formData.get("durationDays") || 0),
      companyId: String(formData.get("companyMode") || "") === "existing" ? String(formData.get("companyId") || "") : null,
      newCompanyName: String(formData.get("newCompanyName") || ""),
      newCompanyWebsite: String(formData.get("newCompanyWebsite") || ""),
    });
    redirect(url);
  } catch (error) {
    if (redirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "";
    const known = ["STRIPE_NOT_CONFIGURED", "OCCUPIED", "NO_PRICE", "COMPANY", "FORBIDDEN", "NOT_FOUND", "CITY", "POSITION"].find((code) => message.includes(code));
    redirect(`/${locale}/comprar?${back.toString()}&error=${encodeURIComponent(known || publicPaymentError(error))}`);
  }
}

export async function joinWaitlist(formData: FormData) {
  const locale = await localeOf(formData);
  if (honeypot(formData)) redirect(`/${locale}/rankings?ok=waitlist`);
  if (!(await rateLimit(`wait:${await ip()}`, 20, 60 * 60 * 1000))) redirect(`/${locale}/rankings?error=rate`);
  const parsed = z.object({
    email: emailSchema,
    categoryId: z.string().min(1),
    countryId: z.string().min(1),
    cityId: z.string().optional(),
    position: z.string().refine(isPosition),
  }).safeParse({
    email: formData.get("email"),
    categoryId: formData.get("categoryId"),
    countryId: formData.get("countryId"),
    cityId: String(formData.get("cityId") || "") || undefined,
    position: formData.get("position"),
  });
  if (!parsed.success) redirect(`/${locale}/rankings?error=waitlist`);
  const user = await currentUser();
  await prisma.waitlistAlert.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      userId: user?.id,
      categoryId: parsed.data.categoryId,
      countryId: parsed.data.countryId,
      cityId: parsed.data.cityId || null,
      position: parsed.data.position,
    },
  });
  await trackEvent({ name: "waitlist_joined", locale, userId: user?.id, metadata: { position: parsed.data.position } });
  redirect(`/${locale}/rankings?ok=waitlist`);
}

export async function submitContact(formData: FormData) {
  const locale = await localeOf(formData);
  if (honeypot(formData)) redirect(`/${locale}/contacto?ok=1`);
  if (!(await rateLimit(`contact:${await ip()}`, 8, 60 * 60 * 1000))) redirect(`/${locale}/contacto?error=rate`);
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    email: emailSchema,
    message: z.string().trim().min(10).max(2000),
  }).safeParse({ name: formData.get("name"), email: formData.get("email"), message: formData.get("message") });
  if (!parsed.success) redirect(`/${locale}/contacto?error=invalid`);
  await prisma.contactMessage.create({ data: { ...parsed.data, email: parsed.data.email.toLowerCase() } });
  redirect(`/${locale}/contacto?ok=1`);
}

export async function submitLead(formData: FormData) {
  const locale = await localeOf(formData);
  const companyId = String(formData.get("companyId") || "");
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) redirect(`/${locale}/empresas`);
  if (honeypot(formData)) redirect(`/${locale}/empresa/${company.slug}?ok=lead`);
  if (!(await rateLimit(`lead:${await ip()}`, 10, 60 * 60 * 1000))) redirect(`/${locale}/empresa/${company.slug}?error=rate`);
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    email: emailSchema,
    message: z.string().trim().min(5).max(2000),
  }).safeParse({ name: formData.get("name"), email: formData.get("email"), message: formData.get("message") });
  if (!parsed.success) redirect(`/${locale}/empresa/${company.slug}?error=lead`);
  await prisma.lead.create({ data: { companyId, name: parsed.data.name, email: parsed.data.email.toLowerCase(), message: parsed.data.message } });
  await trackEvent({ name: "lead_submitted", locale, companyId });
  redirect(`/${locale}/empresa/${company.slug}?ok=lead`);
}

export async function toggleFavorite(formData: FormData) {
  const locale = await localeOf(formData);
  const user = await requireUser();
  const companyId = String(formData.get("companyId") || "");
  const existing = await prisma.favorite.findUnique({ where: { userId_companyId: { userId: user.id, companyId } } });
  if (existing) await prisma.favorite.delete({ where: { userId_companyId: { userId: user.id, companyId } } });
  else await prisma.favorite.create({ data: { userId: user.id, companyId } });
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  redirect(`/${locale}/empresa/${company?.slug || ""}`);
}

export async function createCompany(formData: FormData) {
  const locale = await localeOf(formData);
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const website = String(formData.get("website") || "").trim();
  if (name.length < 2) redirect(`/${locale}/dashboard/perfil?error=name`);
  let slug = slugify(name) || "empresa";
  while (await prisma.company.findUnique({ where: { slug } })) slug = `${slug}-${Math.floor(Math.random() * 999)}`;
  const company = await prisma.company.create({
    data: {
      name,
      slug,
      website: /^https?:\/\//i.test(website) ? website : null,
      claimed: true,
      verificationStatus: "PENDING",
      source: "self-serve",
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  if (user.role === "USER") await prisma.user.update({ where: { id: user.id }, data: { role: "COMPANY" } });
  await audit("company.create", "Company", company.id, user.id);
  redirect(`/${locale}/dashboard/perfil?company=${company.id}`);
}

export async function updateCompany(formData: FormData) {
  const locale = await localeOf(formData);
  const user = await requireUser();
  const companyId = String(formData.get("companyId") || "");
  await memberOrAdmin(user, companyId);
  const year = String(formData.get("foundedYear") || "");
  const employeeRange = String(formData.get("employeeRange") || "");
  const website = String(formData.get("website") || "").trim();
  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: String(formData.get("name") || "").trim().slice(0, 120) || undefined,
      legalName: String(formData.get("legalName") || "").trim().slice(0, 160) || null,
      shortDescription: String(formData.get("shortDescription") || "").trim().slice(0, 240) || null,
      description: String(formData.get("description") || "").trim().slice(0, 4000) || null,
      website: website ? (website.startsWith("http") ? website.slice(0, 300) : null) : null,
      logo: String(formData.get("logo") || "").trim().slice(0, 400) || null,
      region: String(formData.get("region") || "").trim().slice(0, 80) || null,
      foundedYear: year ? Math.min(new Date().getFullYear() + 1, Math.max(1800, Number(year) || 0)) || null : null,
      employeeRange: EMPLOYEE_RANGES.includes(employeeRange as (typeof EMPLOYEE_RANGES)[number]) ? employeeRange : null,
      businessModel: String(formData.get("businessModel") || "").trim().slice(0, 120) || null,
      contactPublic: String(formData.get("contactPublic") || "").trim().slice(0, 180) || null,
      countryId: String(formData.get("countryId") || "") || null,
      cityId: String(formData.get("cityId") || "") || null,
    },
  });
  const categoryIds = formData.getAll("categoryId").map(String).filter(Boolean);
  const technologyIds = formData.getAll("technologyId").map(String).filter(Boolean);
  const industryIds = formData.getAll("industryId").map(String).filter(Boolean);
  await prisma.companyCategory.deleteMany({ where: { companyId } });
  await prisma.companyTechnology.deleteMany({ where: { companyId } });
  await prisma.companyIndustry.deleteMany({ where: { companyId } });
  if (categoryIds.length) {
    await prisma.companyCategory.createMany({ data: categoryIds.map((categoryId, index) => ({ companyId, categoryId, isPrimary: index === 0 })) });
  }
  if (technologyIds.length) await prisma.companyTechnology.createMany({ data: technologyIds.map((technologyId) => ({ companyId, technologyId })) });
  if (industryIds.length) await prisma.companyIndustry.createMany({ data: industryIds.map((industryId) => ({ companyId, industryId })) });
  await audit("company.update", "Company", companyId, user.id);
  redirect(`/${locale}/dashboard/perfil?company=${companyId}&ok=1`);
}

export async function addOffering(formData: FormData) {
  const locale = await localeOf(formData);
  const user = await requireUser();
  const companyId = String(formData.get("companyId") || "");
  await memberOrAdmin(user, companyId);
  const kind = String(formData.get("kind") || "product");
  const name = String(formData.get("name") || "").trim().slice(0, 120);
  const description = String(formData.get("description") || "").trim().slice(0, 500) || null;
  if (!name) redirect(`/${locale}/dashboard/perfil?company=${companyId}`);
  if (kind === "service") await prisma.service.create({ data: { companyId, name, description } });
  else if (kind === "social") {
    const url = String(formData.get("url") || "").trim();
    if (/^https?:\/\//i.test(url)) await prisma.socialLink.create({ data: { companyId, platform: name, url: url.slice(0, 300) } });
  } else await prisma.product.create({ data: { companyId, name, description } });
  redirect(`/${locale}/dashboard/perfil?company=${companyId}`);
}

export async function submitClaim(formData: FormData) {
  const locale = await localeOf(formData);
  const user = await requireUser();
  const companyId = String(formData.get("companyId") || "");
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) redirect(`/${locale}/empresas`);
  const evidence = String(formData.get("evidence") || "").trim().slice(0, 2000);
  const workEmail = String(formData.get("workEmail") || "").trim().toLowerCase();
  if (evidence.length < 10) redirect(`/${locale}/reclamar/${company.slug}?error=evidence`);
  await prisma.companyClaim.create({
    data: { companyId, userId: user.id, evidence, workEmail: workEmail || null, status: "PENDING" },
  });
  await audit("claim.submit", "CompanyClaim", companyId, user.id);
  await trackEvent({ name: "claim_submitted", locale, userId: user.id, companyId });
  redirect(`/${locale}/reclamar/${company.slug}?ok=1`);
}

export async function savePricingRule(formData: FormData) {
  const locale = await localeOf(formData);
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const priceCents = Number(formData.get("priceCents") || 0);
  const durationDays = Number(formData.get("durationDays") || 0);
  const position = String(formData.get("position") || "");
  const currency = String(formData.get("currency") || "eur").toLowerCase().trim().slice(0, 8);
  const cityId = String(formData.get("cityId") || "") || null;
  const countryId = String(formData.get("countryId") || "") || null;
  const problem = validatePricingInput({ position, priceCents, durationDays, currency, cityId, countryId });
  if (problem) redirect(`/${locale}/admin/precios?error=${problem}`);
  const data = {
    position,
    priceCents: Math.round(priceCents),
    durationDays: Math.round(durationDays),
    currency,
    active: formData.get("active") === "on" || formData.get("active") === "true",
    example: false,
    categoryId: String(formData.get("categoryId") || "") || null,
    countryId,
    cityId,
    note: String(formData.get("note") || "").slice(0, 300) || null,
  };
  const saved = id
    ? await prisma.pricingRule.update({ where: { id }, data })
    : await prisma.pricingRule.create({ data });
  await audit("pricing.save", "PricingRule", saved.id, admin.id, { priceCents: data.priceCents, durationDays: data.durationDays, currency: data.currency, active: data.active });
  redirect(`/${locale}/admin/precios?ok=1`);
}

export async function flushOutbox(formData: FormData) {
  const locale = await localeOf(formData);
  await requireAdmin();
  const { dispatchOutbox } = await import("@/lib/maintenance");
  const result = await dispatchOutbox();
  const configured = Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());
  redirect(`/${locale}/admin/avisos?ok=mail&sent=${result.sent}&pending=${result.pending}&mail=${configured ? "ready" : "off"}`);
}

export async function reviewClaim(formData: FormData) {
  const locale = await localeOf(formData);
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  const claim = await prisma.companyClaim.findUnique({ where: { id } });
  if (!claim) redirect(`/${locale}/admin/reclamaciones`);
  if (decision === "reject") {
    await prisma.companyClaim.update({ where: { id }, data: { status: "REJECTED", reviewedAt: new Date() } });
  } else {
    await prisma.companyClaim.update({ where: { id }, data: { status: "APPROVED", reviewedAt: new Date() } });
    await prisma.company.update({
      where: { id: claim.companyId },
      data: { claimed: true, verificationStatus: decision === "verify" ? "VERIFIED" : "PENDING" },
    });
    await prisma.companyMember.upsert({
      where: { userId_companyId: { userId: claim.userId, companyId: claim.companyId } },
      update: { role: "OWNER" },
      create: { userId: claim.userId, companyId: claim.companyId, role: "OWNER" },
    });
    const owner = await prisma.user.findUnique({ where: { id: claim.userId } });
    if (owner && owner.role === "USER") await prisma.user.update({ where: { id: owner.id }, data: { role: "COMPANY" } });
  }
  await audit("claim.review", "CompanyClaim", id, admin.id, { decision });
  redirect(`/${locale}/admin/reclamaciones?ok=1`);
}

export async function setVerification(formData: FormData) {
  const locale = await localeOf(formData);
  const admin = await requireAdmin();
  const companyId = String(formData.get("companyId") || "");
  const verificationStatus = String(formData.get("verificationStatus") || "PENDING");
  if (!["UNCLAIMED", "PENDING", "VERIFIED", "REJECTED"].includes(verificationStatus)) redirect(`/${locale}/admin/empresas`);
  await prisma.company.update({ where: { id: companyId }, data: { verificationStatus, claimed: verificationStatus === "VERIFIED" || verificationStatus === "PENDING" } });
  await audit("company.verify", "Company", companyId, admin.id, { verificationStatus });
  redirect(`/${locale}/admin/empresas?ok=1`);
}

export async function mergeCompanies(formData: FormData) {
  const locale = await localeOf(formData);
  const admin = await requireAdmin();
  const keepId = String(formData.get("keepId") || "");
  const dropId = String(formData.get("dropId") || "");
  if (!keepId || !dropId || keepId === dropId) redirect(`/${locale}/admin/fusionar?error=same`);
  const [keep, drop] = await Promise.all([
    prisma.company.findUnique({ where: { id: keepId } }),
    prisma.company.findUnique({ where: { id: dropId } }),
  ]);
  if (!keep || !drop) redirect(`/${locale}/admin/fusionar?error=missing`);
  const conflict = await prisma.sponsoredPosition.findFirst({
    where: { companyId: dropId, status: { in: ["ACTIVE", "PENDING_PAYMENT"] } },
  });
  if (conflict) {
    const clash = await prisma.sponsoredPosition.findFirst({
      where: {
        companyId: keepId,
        status: { in: ["ACTIVE", "PENDING_PAYMENT"] },
        categoryId: conflict.categoryId,
        countryId: conflict.countryId,
        cityId: conflict.cityId,
        position: conflict.position,
      },
    });
    if (clash) redirect(`/${locale}/admin/fusionar?error=slot`);
  }
  await prisma.$transaction(async (tx) => {
    await tx.sponsoredPosition.updateMany({ where: { companyId: dropId }, data: { companyId: keepId } });
    await tx.campaign.updateMany({ where: { companyId: dropId }, data: { companyId: keepId } });
    await tx.payment.updateMany({ where: { companyId: dropId }, data: { companyId: keepId } });
    await tx.lead.updateMany({ where: { companyId: dropId }, data: { companyId: keepId } });
    await tx.newsItem.updateMany({ where: { companyId: dropId }, data: { companyId: keepId } });
    await tx.signal.updateMany({ where: { companyId: dropId }, data: { companyId: keepId } });
    await tx.companyClaim.updateMany({ where: { companyId: dropId }, data: { companyId: keepId } });
    await tx.product.updateMany({ where: { companyId: dropId }, data: { companyId: keepId } });
    await tx.service.updateMany({ where: { companyId: dropId }, data: { companyId: keepId } });
    await tx.socialLink.updateMany({ where: { companyId: dropId }, data: { companyId: keepId } });
    const cats = await tx.companyCategory.findMany({ where: { companyId: dropId } });
    for (const row of cats) {
      await tx.companyCategory.upsert({
        where: { companyId_categoryId: { companyId: keepId, categoryId: row.categoryId } },
        update: {},
        create: { companyId: keepId, categoryId: row.categoryId },
      });
    }
    const techs = await tx.companyTechnology.findMany({ where: { companyId: dropId } });
    for (const row of techs) {
      await tx.companyTechnology.upsert({
        where: { companyId_technologyId: { companyId: keepId, technologyId: row.technologyId } },
        update: {},
        create: { companyId: keepId, technologyId: row.technologyId },
      });
    }
    const members = await tx.companyMember.findMany({ where: { companyId: dropId } });
    for (const row of members) {
      await tx.companyMember.upsert({
        where: { userId_companyId: { userId: row.userId, companyId: keepId } },
        update: {},
        create: { userId: row.userId, companyId: keepId, role: row.role },
      });
    }
    await tx.company.delete({ where: { id: dropId } });
  });
  await audit("company.merge", "Company", keepId, admin.id, { dropId });
  redirect(`/${locale}/admin/fusionar?ok=1`);
}

const sourceSchema = z.object({
  title: z.string().trim().min(4).max(180),
  summary: z.string().trim().min(10).max(800),
  sourceName: z.string().trim().min(2).max(80),
  sourceUrl: z.string().trim().url().refine((value) => value.startsWith("http://") || value.startsWith("https://")),
});

export async function createNews(formData: FormData) {
  const locale = await localeOf(formData);
  const admin = await requireAdmin();
  const parsed = sourceSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    sourceName: formData.get("sourceName"),
    sourceUrl: formData.get("sourceUrl"),
  });
  if (!parsed.success) redirect(`/${locale}/admin/noticias?error=invalid`);
  let slug = slugify(parsed.data.title) || "noticia";
  while (await prisma.newsItem.findUnique({ where: { slug } })) slug = `${slug}-${Math.floor(Math.random() * 999)}`;
  const item = await prisma.newsItem.create({
    data: { ...parsed.data, slug, locale, publishedAt: new Date(), companyId: String(formData.get("companyId") || "") || null },
  });
  await audit("news.create", "NewsItem", item.id, admin.id);
  redirect(`/${locale}/admin/noticias?ok=1`);
}

export async function createSignal(formData: FormData) {
  const locale = await localeOf(formData);
  const admin = await requireAdmin();
  const parsed = sourceSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    sourceName: formData.get("sourceName"),
    sourceUrl: formData.get("sourceUrl"),
  });
  const kind = String(formData.get("kind") || "other");
  if (!parsed.success) redirect(`/${locale}/admin/senales?error=invalid`);
  let slug = slugify(parsed.data.title) || "senal";
  while (await prisma.signal.findUnique({ where: { slug } })) slug = `${slug}-${Math.floor(Math.random() * 999)}`;
  const item = await prisma.signal.create({
    data: { ...parsed.data, slug, kind, publishedAt: new Date(), companyId: String(formData.get("companyId") || "") || null },
  });
  await audit("signal.create", "Signal", item.id, admin.id);
  redirect(`/${locale}/admin/senales?ok=1`);
}

export async function setUserRole(formData: FormData) {
  const locale = await localeOf(formData);
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "");
  if (!["USER", "COMPANY", "ADMIN"].includes(role)) redirect(`/${locale}/admin/usuarios?error=role`);
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await audit("user.role", "User", userId, admin.id, { role });
  redirect(`/${locale}/admin/usuarios?ok=1`);
}
