import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminTable } from "@/components/admin-table";
import { AnalyticsCard } from "@/components/analytics-card";
import { Flash } from "@/components/flash";
import { currentUser } from "@/lib/auth";
import { loadBoard, listCategories, listCities, listCountries } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { categoryName, countryName, isLocale, positionLabel, t } from "@/lib/i18n";
import { statusLabel } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { POSITION_KEYS } from "@/lib/positions";
import { meta } from "@/lib/seo";
import { SIGNAL_KINDS } from "@/lib/site";
import { stripeMode } from "@/lib/stripe";
import { createNews, createSignal, mergeCompanies, reviewClaim, savePricingRule, setUserRole, setVerification } from "@/server/actions";

const sections = ["inventory", "precios", "empresas", "campanas", "reclamaciones", "fusionar", "usuarios", "noticias", "senales", "eventos"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return meta(locale, "Admin", "TECHPODIO", "/admin", false);
}

export default async function AdminPage({ params, searchParams }: { params: Promise<{ locale: string; section?: string[] }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale, section } = await params;
  if (!isLocale(locale)) notFound();
  const key = section?.[0] || "resumen";
  if (section && (section.length > 1 || !sections.includes(key as (typeof sections)[number]))) notFound();
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/admin`);
  if (user.role !== "ADMIN") redirect(`/${locale}/`);
  const query = await searchParams;
  const links = ["", "inventory", "precios", "empresas", "campanas", "reclamaciones", "fusionar", "usuarios", "noticias", "senales", "eventos"];
  return (
    <div className="wrap dash">
      <h1>Admin</h1>
      <p className="tiny">Stripe: {stripeMode()} · {user.email}</p>
      <nav className="dash-nav">
        {links.map((href) => <Link key={href || "home"} href={`/${locale}/admin${href ? `/${href}` : ""}`} aria-current={key === (href || "resumen") ? "page" : undefined}>{href || t(locale, "Resumen", "Overview")}</Link>)}
      </nav>
      <Flash locale={locale} ok={query.ok} error={query.error} />
      {key === "resumen" ? <Overview locale={locale} /> : null}
      {key === "inventory" ? <Inventory locale={locale} query={query} /> : null}
      {key === "precios" ? <Pricing locale={locale} /> : null}
      {key === "empresas" ? <Companies locale={locale} /> : null}
      {key === "campanas" ? <Campaigns locale={locale} /> : null}
      {key === "reclamaciones" ? <Claims locale={locale} /> : null}
      {key === "fusionar" ? <Merge locale={locale} /> : null}
      {key === "usuarios" ? <Users locale={locale} /> : null}
      {key === "noticias" ? <News locale={locale} /> : null}
      {key === "senales" ? <Signals locale={locale} /> : null}
      {key === "eventos" ? <Events locale={locale} /> : null}
    </div>
  );
}

async function Overview({ locale }: { locale: string }) {
  const [companies, rules, active, pendingClaims, outbox, contacts] = await Promise.all([
    prisma.company.count(),
    prisma.pricingRule.count({ where: { active: true } }),
    prisma.sponsoredPosition.count({ where: { status: "ACTIVE" } }),
    prisma.companyClaim.count({ where: { status: "PENDING" } }),
    prisma.notificationOutbox.count({ where: { sentAt: null } }),
    prisma.contactMessage.count(),
  ]);
  return (
    <div className="stat-row">
      <AnalyticsCard label={t(locale, "Empresas", "Companies")} value={companies} hint={t(locale, "Cero es correcto si nadie ha publicado.", "Zero is correct if nobody has published.")} />
      <AnalyticsCard label={t(locale, "Reglas activas", "Active rules")} value={rules} />
      <AnalyticsCard label={t(locale, "Huecos activos", "Active slots")} value={active} />
      <AnalyticsCard label={t(locale, "Reclamaciones", "Claims")} value={pendingClaims} />
      <AnalyticsCard label={t(locale, "Avisos sin enviar", "Unsent notices")} value={outbox} />
      <AnalyticsCard label={t(locale, "Contactos", "Contacts")} value={contacts} />
    </div>
  );
}

async function Inventory({ locale, query }: { locale: string; query: Record<string, string | undefined> }) {
  const [categories, countries, cities] = await Promise.all([listCategories(), listCountries(), listCities()]);
  const category = categories.find((item) => item.id === query.categoryId);
  const country = countries.find((item) => item.id === query.countryId);
  const city = cities.find((item) => item.id === query.cityId);
  const board = category && country ? await loadBoard({ categoryId: category.id, countryId: country.id, cityId: city?.id || null }) : null;
  const active = await prisma.sponsoredPosition.findMany({ where: { status: "ACTIVE" }, include: { company: true, category: true, country: true, city: true }, take: 50, orderBy: { endDate: "asc" } });
  return (
    <div className="section">
      <h2>{t(locale, "Inventario", "Inventory")}</h2>
      <form className="filters" method="get">
        <select className="select" name="categoryId" defaultValue={query.categoryId || ""}>
          <option value="">{t(locale, "Categoría", "Category")}</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{categoryName(locale, item)}</option>)}
        </select>
        <select className="select" name="countryId" defaultValue={query.countryId || ""}>
          <option value="">{t(locale, "País", "Country")}</option>
          {countries.map((item) => <option key={item.id} value={item.id}>{countryName(locale, item)}</option>)}
        </select>
        <select className="select" name="cityId" defaultValue={query.cityId || ""}>
          <option value="">{t(locale, "País entero", "Whole country")}</option>
          {cities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button className="btn btn-small" type="submit">{t(locale, "Ver huecos", "See slots")}</button>
      </form>
      {board ? (
        <AdminTable
          headers={[t(locale, "Posición", "Position"), t(locale, "Estado", "Status"), t(locale, "Empresa", "Company"), t(locale, "Precio 30d", "30d price")]}
          rows={board.sponsored.map((slot) => [
            positionLabel(locale, slot.position),
            slot.availability.available ? t(locale, "Libre", "Free") : t(locale, "Ocupado", "Taken"),
            slot.active?.company?.name || "—",
            slot.price30 ? formatMoney(slot.price30.priceCents, slot.price30.currency, locale) : "—",
          ])}
        />
      ) : null}
      <h3>{t(locale, "Activas ahora", "Active now")}</h3>
      <AdminTable
        headers={[t(locale, "Empresa", "Company"), t(locale, "Posición", "Position"), t(locale, "Ámbito", "Scope"), t(locale, "Fin", "End")]}
        rows={active.map((slot) => [slot.company?.name || "—", positionLabel(locale, slot.position), `${categoryName(locale, slot.category)} · ${slot.city?.name || countryName(locale, slot.country)}`, slot.endDate?.toISOString().slice(0, 10) || "—"])}
      />
    </div>
  );
}

async function Pricing({ locale }: { locale: string }) {
  const [rules, categories, countries, cities] = await Promise.all([
    prisma.pricingRule.findMany({ orderBy: [{ position: "asc" }, { durationDays: "asc" }] }),
    listCategories(),
    listCountries(),
    listCities(),
  ]);
  return (
    <div className="section">
      <h2>{t(locale, "Reglas de precio", "Pricing rules")}</h2>
      <p className="tiny">{t(locale, "Guardar desmarca el ejemplo. La regla más específica (ciudad, luego país, luego categoría) gana.", "Saving clears the example flag. The most specific rule (city, then country, then category) wins.")}</p>
      <form action={savePricingRule} className="filters">
        <input type="hidden" name="locale" value={locale} />
        <select className="select" name="position">{POSITION_KEYS.map((position) => <option key={position} value={position}>{positionLabel(locale, position)}</option>)}</select>
        <input className="input" name="durationDays" type="number" min={1} placeholder={t(locale, "Días", "Days")} required />
        <input className="input" name="priceCents" type="number" min={100} placeholder={t(locale, "Céntimos", "Cents")} required />
        <input className="input" name="currency" defaultValue="eur" />
        <select className="select" name="categoryId"><option value="">{t(locale, "Toda categoría", "Any category")}</option>{categories.map((item) => <option key={item.id} value={item.id}>{categoryName(locale, item)}</option>)}</select>
        <select className="select" name="countryId"><option value="">{t(locale, "Todo país", "Any country")}</option>{countries.map((item) => <option key={item.id} value={item.id}>{countryName(locale, item)}</option>)}</select>
        <select className="select" name="cityId"><option value="">{t(locale, "Toda ciudad", "Any city")}</option>{cities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <label className="tiny"><input type="checkbox" name="active" defaultChecked /> {t(locale, "Activa", "Active")}</label>
        <button className="btn btn-small" type="submit">{t(locale, "Crear regla", "Create rule")}</button>
      </form>
      {rules.map((rule) => (
        <form key={rule.id} action={savePricingRule} className="card filters">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={rule.id} />
          <input type="hidden" name="categoryId" value={rule.categoryId || ""} />
          <input type="hidden" name="countryId" value={rule.countryId || ""} />
          <input type="hidden" name="cityId" value={rule.cityId || ""} />
          <strong>{positionLabel(locale, rule.position)}</strong>
          <input className="input" name="durationDays" type="number" defaultValue={rule.durationDays} />
          <input className="input" name="priceCents" type="number" defaultValue={rule.priceCents} />
          <input className="input" name="currency" defaultValue={rule.currency} />
          <input type="hidden" name="position" value={rule.position} />
          <label className="tiny"><input type="checkbox" name="active" defaultChecked={rule.active} /> {t(locale, "Activa", "Active")}</label>
          <span className="tiny">{rule.example ? t(locale, "Ejemplo", "Example") : t(locale, "Editada", "Edited")} · {formatMoney(rule.priceCents, rule.currency, locale)}</span>
          <button className="btn btn-small" type="submit">{t(locale, "Guardar", "Save")}</button>
        </form>
      ))}
    </div>
  );
}

async function Companies({ locale }: { locale: string }) {
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" }, take: 100 });
  if (!companies.length) return <p className="muted">{t(locale, "No hay empresas. El catálogo vacío es el estado inicial.", "There are no companies. An empty catalog is the initial state.")}</p>;
  return (
    <div className="grid-cards">
      {companies.map((company) => (
        <form key={company.id} action={setVerification} className="card form-grid">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="companyId" value={company.id} />
          <strong>{company.name}</strong>
          <span className="tiny">{company.slug} · {company.isDemo ? "demo" : "real"}</span>
          <select className="select" name="verificationStatus" defaultValue={company.verificationStatus}>
            {["UNCLAIMED", "PENDING", "VERIFIED", "REJECTED"].map((status) => <option key={status} value={status}>{statusLabel(locale, status)}</option>)}
          </select>
          <button className="btn btn-small" type="submit">{t(locale, "Guardar", "Save")}</button>
        </form>
      ))}
    </div>
  );
}

async function Campaigns({ locale }: { locale: string }) {
  const rows = await prisma.campaign.findMany({ include: { company: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return <AdminTable headers={[t(locale, "Empresa", "Company"), t(locale, "Posición", "Position"), t(locale, "Estado", "Status"), t(locale, "Importe", "Amount")]} rows={rows.map((row) => [row.company.name, positionLabel(locale, row.position), statusLabel(locale, row.status), formatMoney(row.priceCents, row.currency, locale)])} />;
}

async function Claims({ locale }: { locale: string }) {
  const claims = await prisma.companyClaim.findMany({ include: { company: true, user: true }, orderBy: { createdAt: "desc" }, take: 100 });
  if (!claims.length) return <p className="muted">{t(locale, "No hay reclamaciones.", "There are no claims.")}</p>;
  return (
    <div className="grid-cards">
      {claims.map((claim) => (
        <article key={claim.id} className="card">
          <strong>{claim.company.name}</strong>
          <p className="tiny">{claim.user.email} · {statusLabel(locale, claim.status)}</p>
          <p>{claim.evidence}</p>
          {claim.status === "PENDING" ? (
            <form action={reviewClaim} className="filters">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={claim.id} />
              <button className="btn btn-small" name="decision" value="approve" type="submit">{t(locale, "Aprobar", "Approve")}</button>
              <button className="btn btn-small" name="decision" value="verify" type="submit">{t(locale, "Aprobar y verificar", "Approve and verify")}</button>
              <button className="btn btn-ghost btn-small" name="decision" value="reject" type="submit">{t(locale, "Rechazar", "Reject")}</button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}

async function Merge({ locale }: { locale: string }) {
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  return (
    <form action={mergeCompanies} className="form-grid">
      <input type="hidden" name="locale" value={locale} />
      <p>{t(locale, "La ficha que se conserva absorbe relaciones. No fusiona si ambas tienen el mismo hueco activo.", "The kept profile absorbs relations. It will not merge if both hold the same active slot.")}</p>
      <select className="select" name="keepId">{companies.map((company) => <option key={company.id} value={company.id}>{t(locale, "Conservar", "Keep")} · {company.name}</option>)}</select>
      <select className="select" name="dropId">{companies.map((company) => <option key={company.id} value={company.id}>{t(locale, "Fundir", "Merge away")} · {company.name}</option>)}</select>
      <button className="btn" type="submit">{t(locale, "Fusionar", "Merge")}</button>
    </form>
  );
}

async function Users({ locale }: { locale: string }) {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="grid-cards">
      {users.map((user) => (
        <form key={user.id} action={setUserRole} className="card filters">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="userId" value={user.id} />
          <span>{user.email}</span>
          <select className="select" name="role" defaultValue={user.role}>
            <option value="USER">USER</option>
            <option value="COMPANY">COMPANY</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button className="btn btn-small" type="submit">{t(locale, "Guardar", "Save")}</button>
        </form>
      ))}
    </div>
  );
}

function SourceForm({ locale, action, kinds }: { locale: string; action: (formData: FormData) => Promise<void>; kinds?: readonly string[] }) {
  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="locale" value={locale} />
      <input className="input" name="title" required placeholder={t(locale, "Título", "Title")} />
      <textarea className="textarea" name="summary" required placeholder={t(locale, "Resumen", "Summary")} />
      <input className="input" name="sourceName" required placeholder={t(locale, "Medio", "Publisher")} />
      <input className="input" name="sourceUrl" required placeholder="https://" />
      {kinds ? <select className="select" name="kind">{kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select> : null}
      <button className="btn" type="submit">{t(locale, "Publicar con fuente", "Publish with source")}</button>
    </form>
  );
}

function News({ locale }: { locale: string }) {
  return <SourceForm locale={locale} action={createNews} />;
}

function Signals({ locale }: { locale: string }) {
  return <SourceForm locale={locale} action={createSignal} kinds={SIGNAL_KINDS} />;
}

async function Events({ locale }: { locale: string }) {
  const [grouped, contacts] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ["name"], _count: { name: true } }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return (
    <div className="section">
      <AdminTable headers={[t(locale, "Evento", "Event"), t(locale, "Veces", "Count")]} rows={grouped.map((row) => [row.name, row._count.name])} />
      <h3>{t(locale, "Mensajes de contacto", "Contact messages")}</h3>
      {contacts.map((message) => <article key={message.id} className="card"><strong>{message.name}</strong><p className="tiny">{message.email}</p><p>{message.message}</p></article>)}
    </div>
  );
}
