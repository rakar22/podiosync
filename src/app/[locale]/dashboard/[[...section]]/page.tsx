import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnalyticsCard } from "@/components/analytics-card";
import { CompanyCard } from "@/components/company-card";
import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { LeadCard } from "@/components/lead-card";
import type { Prisma } from "@prisma/client";
import { currentUser } from "@/lib/auth";
import { companyInclude, listCategories, listCities, listCountries, listIndustries, listTechnologies } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { categoryName, countryName, positionLabel, t } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";
import { daysLeft, formatMoney, renewalSentence } from "@/lib/money";
import { statusLabel } from "@/lib/labels";
import { meta } from "@/lib/seo";
import { EMPLOYEE_RANGES } from "@/lib/site";
import { addOffering, createCompany, deleteAccount, logout, updateCompany } from "@/server/actions";

const sections = ["perfil", "posiciones", "campanas", "estadisticas", "leads", "facturacion", "configuracion", "favoritos"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; section?: string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return meta(locale, t(locale, "Panel", "Dashboard"), "TECHPODIO", "/dashboard", false);
}

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ locale: string; section?: string[] }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale, section } = await params;
  if (!isLocale(locale)) notFound();
  const key = section?.[0] || "resumen";
  if (section && section.length > 1) notFound();
  if (key !== "resumen" && !sections.includes(key as (typeof sections)[number])) notFound();
  const query = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/dashboard${key === "resumen" ? "" : `/${key}`}`);
  const companyId = query.company || user.memberships[0]?.companyId;
  const company = companyId ? await prisma.company.findUnique({ where: { id: companyId }, include: companyInclude }) : null;
  const allowed = company && (user.role === "ADMIN" || user.memberships.some((member) => member.companyId === company.id));
  const nav = [
    ["", t(locale, "Resumen", "Overview")],
    ["perfil", t(locale, "Perfil", "Profile")],
    ["posiciones", t(locale, "Posiciones", "Positions")],
    ["campanas", t(locale, "Campañas", "Campaigns")],
    ["estadisticas", t(locale, "Estadísticas", "Stats")],
    ["leads", "Leads"],
    ["facturacion", t(locale, "Facturación", "Billing")],
    ["favoritos", t(locale, "Favoritos", "Favorites")],
    ["configuracion", t(locale, "Configuración", "Settings")],
  ];
  return (
    <div className="wrap dash">
      <header className="section-head">
        <div>
          <p className="kicker">{user.email}</p>
          <h1>{t(locale, "Panel de empresa", "Company dashboard")}</h1>
        </div>
        <form action={logout}><button className="btn btn-ghost btn-small" type="submit">{t(locale, "Salir", "Log out")}</button></form>
      </header>
      <nav className="dash-nav">
        {nav.map(([href, label]) => (
          <Link key={href} href={`/${locale}/dashboard${href ? `/${href}` : ""}${company ? `?company=${company.id}` : ""}`} aria-current={key === (href || "resumen") ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      <Flash locale={locale} ok={query.ok} error={query.error} />
      {user.memberships.length > 1 ? (
        <form method="get" className="filters">
          <select className="select" name="company" defaultValue={company?.id}>
            {user.memberships.map((member) => <option key={member.companyId} value={member.companyId}>{member.company.name}</option>)}
          </select>
          <button className="btn btn-small" type="submit">{t(locale, "Cambiar", "Switch")}</button>
        </form>
      ) : null}
      {key === "resumen" ? <Overview locale={locale} hasCompany={Boolean(allowed)} /> : null}
      {key === "perfil" ? <Profile locale={locale} company={allowed ? company : null} /> : null}
      {key === "posiciones" && allowed && company ? <Positions locale={locale} companyId={company.id} /> : null}
      {key === "campanas" && allowed && company ? <Campaigns locale={locale} companyId={company.id} /> : null}
      {key === "estadisticas" && allowed && company ? <Stats locale={locale} companyId={company.id} slug={company.slug} /> : null}
      {key === "leads" && allowed && company ? <Leads locale={locale} companyId={company.id} /> : null}
      {key === "facturacion" && allowed && company ? <Billing locale={locale} companyId={company.id} /> : null}
      {key === "favoritos" ? <Favorites locale={locale} userId={user.id} /> : null}
      {key === "configuracion" ? <Settings locale={locale} /> : null}
      {key !== "resumen" && key !== "favoritos" && key !== "configuracion" && !allowed ? (
        <EmptyState
          title={t(locale, "Sin empresa", "No company")}
          body={t(locale, "Crea una ficha para comprar un hueco, o reclama una empresa ya publicada.", "Create a profile to buy a slot, or claim a company that is already published.")}
          actions={[
            { href: `/${locale}/dashboard/perfil`, label: t(locale, "Subir empresa", "Add a company") },
            { href: `/${locale}/empresas`, label: t(locale, "Reclamar una ficha", "Claim a profile") },
            { href: `/${locale}/precios`, label: t(locale, "Ver precios", "See pricing") },
          ]}
        />
      ) : null}
    </div>
  );
}

function Overview({ locale, hasCompany }: { locale: string; hasCompany: boolean }) {
  return (
    <section className="card">
      <h2>{t(locale, "Qué puedes hacer", "What you can do")}</h2>
      <p>{hasCompany ? t(locale, "Edita la ficha, mira posiciones y responde leads. Los números del panel salen de datos reales.", "Edit the profile, review positions, and answer leads. Dashboard numbers come from real data.") : t(locale, "Todavía no hay una empresa vinculada a esta cuenta. El siguiente paso es crear la ficha y, con un hueco libre, contratar la primera posición.", "There is no company linked to this account yet. The next step is to create the profile and, with a free slot, buy the first position.")}</p>
      {!hasCompany ? (
        <div className="empty-actions">
          <Link className="btn btn-small" href={`/${locale}/dashboard/perfil`}>{t(locale, "Subir empresa", "Add a company")}</Link>
          <Link className="btn btn-ghost btn-small" href={`/${locale}/precios`}>{t(locale, "Ver precios", "See pricing")}</Link>
        </div>
      ) : (
        <div className="empty-actions">
          <Link className="btn btn-small" href={`/${locale}/rankings`}>{t(locale, "Elegir un ranking", "Choose a ranking")}</Link>
          <Link className="btn btn-ghost btn-small" href={`/${locale}/dashboard/posiciones`}>{t(locale, "Ver posiciones", "See positions")}</Link>
        </div>
      )}
    </section>
  );
}

async function Profile({ locale, company }: { locale: string; company: Prisma.CompanyGetPayload<{ include: typeof companyInclude }> | null }) {
  const [categories, countries, cities, technologies, industries] = await Promise.all([listCategories(), listCountries(), listCities(), listTechnologies(), listIndustries()]);
  if (!company) {
    return (
      <form action={createCompany} className="form-grid">
        <input type="hidden" name="locale" value={locale} />
        <h2>{t(locale, "Crear ficha", "Create profile")}</h2>
        <input className="input" name="name" required placeholder={t(locale, "Nombre de la empresa", "Company name")} />
        <input className="input" name="website" placeholder="https://" />
        <button className="btn" type="submit">{t(locale, "Crear", "Create")}</button>
      </form>
    );
  }
  const selectedCategories = new Set(company.categories.map((item) => item.categoryId));
  const selectedTech = new Set(company.technologies.map((item) => item.technologyId));
  const selectedIndustries = new Set(company.industries.map((item) => item.industryId));
  return (
    <div className="split">
      <form action={updateCompany} className="form-grid">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="companyId" value={company.id} />
        <label className="field">{t(locale, "Nombre", "Name")}<input className="input" name="name" defaultValue={company.name} required /></label>
        <label className="field">{t(locale, "Razón social", "Legal name")}<input className="input" name="legalName" defaultValue={company.legalName || ""} /></label>
        <label className="field">{t(locale, "Resumen", "Summary")}<input className="input" name="shortDescription" defaultValue={company.shortDescription || ""} /></label>
        <label className="field">{t(locale, "Descripción", "Description")}<textarea className="textarea" name="description" defaultValue={company.description || ""} /></label>
        <label className="field">Web<input className="input" name="website" defaultValue={company.website || ""} /></label>
        <label className="field">{t(locale, "URL del logo", "Logo URL")}<input className="input" name="logo" defaultValue={company.logo || ""} /></label>
        <label className="field">{t(locale, "País", "Country")}
          <select className="select" name="countryId" defaultValue={company.countryId || ""}>
            <option value="">—</option>
            {countries.map((country) => <option key={country.id} value={country.id}>{countryName(locale, country)}</option>)}
          </select>
        </label>
        <label className="field">{t(locale, "Ciudad", "City")}
          <select className="select" name="cityId" defaultValue={company.cityId || ""}>
            <option value="">—</option>
            {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
        </label>
        <label className="field">{t(locale, "Región", "Region")}<input className="input" name="region" defaultValue={company.region || ""} /></label>
        <label className="field">{t(locale, "Año de fundación (si quieres publicarlo)", "Founding year (if you want it public)")}<input className="input" name="foundedYear" defaultValue={company.foundedYear || ""} /></label>
        <label className="field">{t(locale, "Plantilla declarada por ti", "Headcount you declare")}
          <select className="select" name="employeeRange" defaultValue={company.employeeRange || ""}>
            <option value="">{t(locale, "No publicar", "Do not publish")}</option>
            {EMPLOYEE_RANGES.map((range) => <option key={range} value={range}>{range}</option>)}
          </select>
        </label>
        <label className="field">{t(locale, "Modelo de negocio", "Business model")}<input className="input" name="businessModel" defaultValue={company.businessModel || ""} /></label>
        <label className="field">{t(locale, "Contacto público", "Public contact")}<input className="input" name="contactPublic" defaultValue={company.contactPublic || ""} /></label>
        <fieldset>
          <legend>{t(locale, "Categorías", "Categories")}</legend>
          {categories.map((category) => <label key={category.id} className="tiny"><input type="checkbox" name="categoryId" value={category.id} defaultChecked={selectedCategories.has(category.id)} /> {categoryName(locale, category)}</label>)}
        </fieldset>
        <fieldset>
          <legend>{t(locale, "Tecnologías que declaras", "Technologies you declare")}</legend>
          {technologies.map((technology) => <label key={technology.id} className="tiny"><input type="checkbox" name="technologyId" value={technology.id} defaultChecked={selectedTech.has(technology.id)} /> {technology.name}</label>)}
        </fieldset>
        <fieldset>
          <legend>{t(locale, "Industrias", "Industries")}</legend>
          {industries.map((industry) => <label key={industry.id} className="tiny"><input type="checkbox" name="industryId" value={industry.id} defaultChecked={selectedIndustries.has(industry.id)} /> {locale === "en" ? industry.nameEn : industry.nameEs}</label>)}
        </fieldset>
        <button className="btn" type="submit">{t(locale, "Guardar ficha", "Save profile")}</button>
      </form>
      <div className="form-grid">
        <form action={addOffering} className="card form-grid">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="kind" value="product" />
          <h3>{t(locale, "Producto", "Product")}</h3>
          <input className="input" name="name" placeholder={t(locale, "Nombre", "Name")} />
          <input className="input" name="description" placeholder={t(locale, "Descripción", "Description")} />
          <button className="btn btn-small" type="submit">{t(locale, "Añadir", "Add")}</button>
        </form>
        <form action={addOffering} className="card form-grid">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="kind" value="service" />
          <h3>{t(locale, "Servicio", "Service")}</h3>
          <input className="input" name="name" placeholder={t(locale, "Nombre", "Name")} />
          <input className="input" name="description" placeholder={t(locale, "Descripción", "Description")} />
          <button className="btn btn-small" type="submit">{t(locale, "Añadir", "Add")}</button>
        </form>
        <form action={addOffering} className="card form-grid">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="kind" value="social" />
          <h3>{t(locale, "Red social", "Social link")}</h3>
          <input className="input" name="name" placeholder={t(locale, "Plataforma", "Platform")} />
          <input className="input" name="url" placeholder="https://" />
          <button className="btn btn-small" type="submit">{t(locale, "Añadir", "Add")}</button>
        </form>
        <p className="tiny">{t(locale, "Estado de verificación", "Verification status")}: {statusLabel(locale, company.verificationStatus)}. {t(locale, "Solo un admin puede marcarla como verificada.", "Only an admin can mark it verified.")}</p>
      </div>
    </div>
  );
}

async function Positions({ locale, companyId }: { locale: string; companyId: string }) {
  const slots = await prisma.sponsoredPosition.findMany({ where: { companyId }, include: { category: true, country: true, city: true }, orderBy: { createdAt: "desc" } });
  if (!slots.length) {
    return (
      <EmptyState
        title={t(locale, "Sin posiciones", "No positions")}
        body={t(locale, "Tu primera campaña empieza eligiendo un hueco libre en un ranking. El precio sale de la regla vigente.", "Your first campaign starts by choosing a free slot on a ranking. The price comes from the current rule.")}
        actions={[
          { href: `/${locale}/rankings`, label: t(locale, "Ver rankings", "View rankings") },
          { href: `/${locale}/precios`, label: t(locale, "Ver precios", "See pricing") },
        ]}
      />
    );
  }
  return (
    <div className="grid-cards">
      {slots.map((slot) => {
        const left = daysLeft(slot.endDate);
        const params = new URLSearchParams({ categoryId: slot.categoryId, countryId: slot.countryId, position: slot.position });
        if (slot.cityId) params.set("cityId", slot.cityId);
        return (
          <article key={slot.id} className="card">
            <h3>{positionLabel(locale, slot.position)}</h3>
            <p>{categoryName(locale, slot.category)} · {slot.city?.name || countryName(locale, slot.country)}</p>
            <p className="tiny">{statusLabel(locale, slot.status)} · {formatMoney(slot.priceCents, slot.currency, locale)}</p>
            {slot.status === "ACTIVE" && left != null ? <p className="renewal">{renewalSentence(locale, positionLabel(locale, slot.position), left)}</p> : null}
            {slot.status === "ACTIVE" || slot.status === "EXPIRED" ? <Link className="btn btn-small btn-copper" href={`/${locale}/comprar?${params.toString()}`}>{t(locale, "Renovar", "Renew")}</Link> : null}
          </article>
        );
      })}
    </div>
  );
}

async function Campaigns({ locale, companyId }: { locale: string; companyId: string }) {
  const rows = await prisma.campaign.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
  if (!rows.length) return <EmptyState title={t(locale, "Sin campañas", "No campaigns")} body={t(locale, "Una campaña se crea al empezar el checkout.", "A campaign is created when checkout starts.")} />;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>{t(locale, "Estado", "Status")}</th><th>{t(locale, "Posición", "Position")}</th><th>{t(locale, "Precio", "Price")}</th><th>{t(locale, "Fin", "End")}</th></tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.id}><td>{statusLabel(locale, row.status)}</td><td>{positionLabel(locale, row.position)}</td><td>{formatMoney(row.priceCents, row.currency, locale)}</td><td>{row.endDate ? row.endDate.toISOString().slice(0, 10) : "—"}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

async function Stats({ locale, companyId, slug }: { locale: string; companyId: string; slug: string }) {
  const [leads, slots, favorites, views] = await Promise.all([
    prisma.lead.count({ where: { companyId } }),
    prisma.sponsoredPosition.count({ where: { companyId, status: "ACTIVE" } }),
    prisma.favorite.count({ where: { companyId } }),
    prisma.analyticsEvent.count({ where: { name: "page_view", path: { contains: `/empresa/${slug}` } } }),
  ]);
  return (
    <div className="stat-row">
      <AnalyticsCard label="Leads" value={leads} />
      <AnalyticsCard label={t(locale, "Posiciones activas", "Active positions")} value={slots} />
      <AnalyticsCard label={t(locale, "Favoritos", "Favorites")} value={favorites} />
      <AnalyticsCard label={t(locale, "Vistas con consentimiento", "Consented views")} value={views} hint={t(locale, "Solo si la persona aceptó analítica.", "Only if the person accepted analytics.")} />
    </div>
  );
}

async function Leads({ locale, companyId }: { locale: string; companyId: string }) {
  const leads = await prisma.lead.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
  if (!leads.length) return <EmptyState title="Leads" body={t(locale, "Nadie ha escrito todavía.", "Nobody has written yet.")} />;
  return <div className="grid-cards">{leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}</div>;
}

async function Billing({ locale, companyId }: { locale: string; companyId: string }) {
  const payments = await prisma.payment.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
  if (!payments.length) return <EmptyState title={t(locale, "Sin pagos", "No payments")} body={t(locale, "Los cobros de Stripe aparecerán aquí.", "Stripe charges will show up here.")} />;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>{t(locale, "Fecha", "Date")}</th><th>{t(locale, "Importe", "Amount")}</th><th>{t(locale, "Estado", "Status")}</th></tr></thead>
        <tbody>{payments.map((payment) => <tr key={payment.id}><td>{payment.createdAt.toISOString().slice(0, 10)}</td><td>{formatMoney(payment.amountCents, payment.currency, locale)}</td><td>{statusLabel(locale, payment.status)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

async function Favorites({ locale, userId }: { locale: string; userId: string }) {
  const rows = await prisma.favorite.findMany({ where: { userId }, include: { company: { include: companyInclude } } });
  if (!rows.length) return <EmptyState title={t(locale, "Sin favoritos", "No favorites")} body={t(locale, "Guarda una ficha desde su página.", "Save a profile from its page.")} />;
  return <div className="grid-cards">{rows.map((row) => <CompanyCard key={row.companyId} locale={locale} company={row.company} />)}</div>;
}

function Settings({ locale }: { locale: string }) {
  return (
    <form action={deleteAccount} className="card form-grid">
      <input type="hidden" name="locale" value={locale} />
      <h2>{t(locale, "Borrar cuenta", "Delete account")}</h2>
      <p className="tiny">{t(locale, "Anonimiza el email y quita accesos. No se puede si tienes una campaña activa. Los pagos se conservan por obligación contable.", "Anonymises the email and removes access. It is blocked if you have an active campaign. Payments are kept for accounting.")}</p>
      <button className="btn btn-danger" type="submit">{t(locale, "Borrar mi cuenta", "Delete my account")}</button>
    </form>
  );
}
