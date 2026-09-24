import Link from "next/link";
import { Flash } from "@/components/flash";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";
import { register } from "@/server/actions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Crear cuenta", "Create account"), "TECHPODIO", "/register", false);
}

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const locale = await readLocale(params);
  const query = await searchParams;
  return (
    <div className="wrap" style={{ maxWidth: 520 }}>
      <section className="hero">
        <h1>{t(locale, "Crear cuenta", "Create account")}</h1>
        <p className="muted">{t(locale, "Contraseña de al menos 10 caracteres.", "Password of at least 10 characters.")}</p>
      </section>
      <Flash locale={locale} error={query.error} />
      <form action={register} className="form-grid">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={query.next || `/${locale}/dashboard`} />
        <input className="input" name="name" placeholder={t(locale, "Nombre", "Name")} aria-label={t(locale, "Nombre", "Name")} />
        <input className="input" type="email" name="email" required placeholder="Email" aria-label="Email" />
        <input className="input" type="password" name="password" required minLength={10} placeholder={t(locale, "Contraseña", "Password")} aria-label={t(locale, "Contraseña", "Password")} />
        <button className="btn" type="submit">{t(locale, "Crear cuenta", "Create account")}</button>
      </form>
      <p className="tiny"><Link href={`/${locale}/login`}>{t(locale, "Ya tengo cuenta", "I already have an account")}</Link></p>
    </div>
  );
}
