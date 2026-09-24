import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Flash } from "@/components/flash";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";
import { submitClaim } from "@/server/actions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = await readLocale(Promise.resolve({ locale: raw }));
  return meta(locale, t(locale, "Reclamar empresa", "Claim company"), slug, `/reclamar/${slug}`, false);
}

export default async function ClaimPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug, ...rest } = await params;
  const locale = await readLocale(Promise.resolve(rest));
  const query = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/reclamar/${slug}`);
  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();
  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <section className="hero">
        <h1>{t(locale, "Reclamar", "Claim")} {company.name}</h1>
        <p className="muted">{t(locale, "Un admin revisa la solicitud. Hasta entonces no editas la ficha, salvo que ya seas miembro.", "An admin reviews the request. Until then you do not edit the profile, unless you are already a member.")}</p>
      </section>
      <Flash locale={locale} ok={query.ok} error={query.error} />
      {query.ok ? (
        <p className="notice">{t(locale, "Solicitud guardada. Cuando un admin la apruebe, la ficha aparecerá en tu panel y podrás contratar un hueco.", "Request saved. When an admin approves it, the profile appears in your dashboard and you can buy a slot.")} <Link href={`/${locale}/precios`}>{t(locale, "Ver precios", "See pricing")}</Link></p>
      ) : null}
      <form action={submitClaim} className="form-grid">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="companyId" value={company.id} />
        <input className="input" type="email" name="workEmail" placeholder={t(locale, "Email corporativo", "Work email")} aria-label={t(locale, "Email corporativo", "Work email")} />
        <textarea className="textarea" name="evidence" required placeholder={t(locale, "Cómo representas a la empresa y dónde podemos comprobarlo", "How you represent the company and where we can check")} />
        <button className="btn" type="submit">{t(locale, "Enviar reclamación", "Submit claim")}</button>
      </form>
    </div>
  );
}
