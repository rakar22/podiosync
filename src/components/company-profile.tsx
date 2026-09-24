import Link from "next/link";
import { categoryName, countryName, t } from "@/lib/i18n";
import { ClaimCompanyButton } from "./claim-company-button";
import { PremiumBadge } from "./premium-badge";
import { SponsoredBadge } from "./sponsored-badge";
import { VerifiedBadge } from "./verified-badge";
import { submitLead, toggleFavorite } from "@/server/actions";

export function CompanyProfile({
  locale,
  company,
  sponsored,
  loggedIn,
  favored,
}: {
  locale: string;
  loggedIn: boolean;
  favored: boolean;
  sponsored: boolean;
  company: {
    id: string;
    slug: string;
    name: string;
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
    city?: { name: string; slug: string } | null;
    country?: { nameEs: string; nameEn: string; slug: string } | null;
    categories: { category: { slug: string; nameEs: string; nameEn: string } }[];
    technologies: { technology: { slug: string; name: string } }[];
    industries: { industry: { slug: string; nameEs: string; nameEn: string } }[];
    products: { name: string; description: string | null }[];
    services: { name: string; description: string | null }[];
    socialLinks: { platform: string; url: string }[];
  };
}) {
  const place = [company.city?.name, company.country ? countryName(locale, company.country) : null, company.region].filter(Boolean).join(" · ");
  return (
    <div className="profile-grid">
      <article className="profile">
        <div className="badges">
          {sponsored ? <SponsoredBadge locale={locale} /> : null}
          {company.verificationStatus === "VERIFIED" ? <VerifiedBadge locale={locale} /> : null}
          {company.premium ? <PremiumBadge locale={locale} /> : null}
          {company.isDemo ? <span className="badge badge-demo">Demo</span> : null}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {company.logo ? <img className="logo" src={company.logo} alt="" /> : <div className="logo-fallback">{company.name.slice(0, 1)}</div>}
          <div>
            <h1>{company.name}</h1>
            <p className="tiny">{place || t(locale, "Ubicación no publicada", "Location not published")}</p>
          </div>
        </div>
        {company.legalName ? <p className="tiny">{t(locale, "Razón social", "Legal name")}: {company.legalName}</p> : null}
        <p>{company.shortDescription || t(locale, "Esta ficha todavía no tiene un resumen.", "This profile does not have a summary yet.")}</p>
        {company.description ? <p>{company.description}</p> : null}
        <div className="badges">
          {company.categories.map((item) => <Link key={item.category.slug} className="badge" href={`/${locale}/categorias/${item.category.slug}`}>{categoryName(locale, item.category)}</Link>)}
          {company.technologies.map((item) => <Link key={item.technology.slug} className="badge" href={`/${locale}/tecnologias/${item.technology.slug}`}>{item.technology.name}</Link>)}
        </div>
        <ul>
          {company.foundedYear ? <li>{t(locale, "Año de fundación declarado", "Declared founding year")}: {company.foundedYear}</li> : null}
          {company.employeeRange ? <li>{t(locale, "Rango de plantilla declarado por la empresa", "Headcount range declared by the company")}: {company.employeeRange}</li> : null}
          {company.businessModel ? <li>{company.businessModel}</li> : null}
          {company.contactPublic ? <li>{company.contactPublic}</li> : null}
        </ul>
        {company.website ? <p><a href={company.website} rel="noopener noreferrer">{company.website}</a></p> : null}
        {company.socialLinks.length ? (
          <p className="tiny">{company.socialLinks.map((link) => (
            <a key={link.url} href={link.url} rel="noopener noreferrer" style={{ marginRight: 8 }}>{link.platform}</a>
          ))}</p>
        ) : null}
        {company.source ? <p className="tiny">{t(locale, "Origen de la ficha", "Profile source")}: {company.source}{company.sourceUrl ? ` · ${company.sourceUrl}` : ""}</p> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ClaimCompanyButton locale={locale} slug={company.slug} loggedIn={loggedIn} />
          {loggedIn ? (
            <form action={toggleFavorite}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="companyId" value={company.id} />
              <button className="btn btn-ghost" type="submit">{favored ? t(locale, "Quitar de favoritos", "Remove favorite") : t(locale, "Guardar", "Save")}</button>
            </form>
          ) : null}
        </div>
        {company.products.length ? (
          <section>
            <h2>{t(locale, "Productos declarados", "Declared products")}</h2>
            {company.products.map((item) => <p key={item.name}><strong>{item.name}.</strong> {item.description}</p>)}
          </section>
        ) : null}
        {company.services.length ? (
          <section>
            <h2>{t(locale, "Servicios declarados", "Declared services")}</h2>
            {company.services.map((item) => <p key={item.name}><strong>{item.name}.</strong> {item.description}</p>)}
          </section>
        ) : null}
      </article>
      <aside className="panel">
        <h2>{t(locale, "Contactar", "Contact")}</h2>
        <p className="tiny">{t(locale, "El mensaje llega a la empresa. TECHPODIO no publica reseñas.", "The message goes to the company. TECHPODIO does not publish reviews.")}</p>
        <form action={submitLead} className="form-grid">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="companyId" value={company.id} />
          <input type="text" name="website_hp" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
          <input className="input" name="name" required placeholder={t(locale, "Nombre", "Name")} aria-label={t(locale, "Nombre", "Name")} />
          <input className="input" type="email" name="email" required placeholder="Email" aria-label="Email" />
          <textarea className="textarea" name="message" required placeholder={t(locale, "Mensaje", "Message")} aria-label={t(locale, "Mensaje", "Message")} />
          <button className="btn" type="submit">{t(locale, "Enviar", "Send")}</button>
        </form>
      </aside>
    </div>
  );
}
