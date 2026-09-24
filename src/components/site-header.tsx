import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { t, ui } from "@/lib/i18n";
import { logout } from "@/server/actions";

export async function SiteHeader({ locale }: { locale: string }) {
  const labels = ui(locale);
  const user = await currentUser();
  const other = locale === "en" ? "es" : "en";
  const links = [
    ["empresas", labels.companies],
    ["rankings", labels.rankings],
    ["categorias", labels.categories],
    ["precios", labels.pricing],
    ["para-empresas", labels.forCompanies],
    ["ia", labels.ai],
  ] as const;
  return (
    <header className="site-header">
      <a className="skip" href="#contenido">{t(locale, "Saltar al contenido", "Skip to content")}</a>
      <div className="wrap header-inner">
        <Link className="brand" href={`/${locale}`}>
          <span className="mark" aria-hidden="true"><i /><i /><i /></span>
          TECHPODIO
        </Link>
        <nav className="nav-desktop" aria-label="Principal">
          {links.map(([href, label]) => <Link key={href} href={`/${locale}/${href}`}>{label}</Link>)}
          <span className="lang">
            <Link href={`/${locale}`} aria-current="true">{locale.toUpperCase()}</Link>
            <Link href={`/${other}`}>{other.toUpperCase()}</Link>
          </span>
          {user ? <Link href={`/${locale}/dashboard`}>{labels.dashboard}</Link> : <Link href={`/${locale}/login`}>{labels.login}</Link>}
          {user?.role === "ADMIN" ? <Link href={`/${locale}/admin`}>{labels.admin}</Link> : null}
        </nav>
        <details className="nav-details">
          <summary>{labels.menu}</summary>
          <nav>
            {links.map(([href, label]) => <Link key={href} href={`/${locale}/${href}`}>{label}</Link>)}
            <Link href={`/${other}`}>{other.toUpperCase()}</Link>
            {user ? <Link href={`/${locale}/dashboard`}>{labels.dashboard}</Link> : <Link href={`/${locale}/login`}>{labels.login}</Link>}
            {user ? (
              <form action={logout}><button className="btn btn-ghost btn-small" type="submit">{labels.logout}</button></form>
            ) : null}
          </nav>
        </details>
      </div>
    </header>
  );
}
