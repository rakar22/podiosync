import Link from "next/link";
import { t } from "@/lib/i18n";

export function ClaimCompanyButton({ locale, slug, loggedIn }: { locale: string; slug: string; loggedIn: boolean }) {
  const href = loggedIn ? `/${locale}/reclamar/${slug}` : `/${locale}/login?next=/${locale}/reclamar/${slug}`;
  return <Link className="btn btn-ghost" href={href}>{t(locale, "Reclamar esta empresa", "Claim this company")}</Link>;
}
