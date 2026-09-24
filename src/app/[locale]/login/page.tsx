import Link from "next/link";
import { Flash } from "@/components/flash";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";
import { login } from "@/server/actions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Entrar", "Log in"), "TECHPODIO", "/login", false);
}

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const locale = await readLocale(params);
  const query = await searchParams;
  const next = query.next || `/${locale}/dashboard`;
  return (
    <div className="wrap" style={{ maxWidth: 520 }}>
      <section className="hero"><h1>{t(locale, "Entrar", "Log in")}</h1></section>
      <Flash locale={locale} error={query.error} />
      <form action={login} className="form-grid">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={next} />
        <input className="input" type="email" name="email" required placeholder="Email" aria-label="Email" />
        <input className="input" type="password" name="password" required minLength={10} placeholder={t(locale, "Contraseña", "Password")} aria-label={t(locale, "Contraseña", "Password")} />
        <button className="btn" type="submit">{t(locale, "Entrar", "Log in")}</button>
      </form>
      <p className="tiny"><Link href={`/${locale}/register?next=${encodeURIComponent(next)}`}>{t(locale, "Crear cuenta", "Create account")}</Link></p>
    </div>
  );
}
