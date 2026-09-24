import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Flash } from "@/components/flash";
import { JsonLd } from "@/components/json-ld";
import { RankingBoard } from "@/components/ranking-board";
import { loadBoard, listCategories, listCountries } from "@/lib/catalog";
import { categoryName, countryName, isLocale, t } from "@/lib/i18n";
import { absolute, meta } from "@/lib/seo";
import { siteName } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug?: string[] }> }) {
  const { locale, slug = [] } = await params;
  if (!isLocale(locale)) return {};
  return meta(locale, t(locale, "Rankings", "Rankings"), t(locale, "Posiciones patrocinadas a precio fijo y ranking orgánico separado.", "Fixed-price sponsored positions and a separate organic ranking."), `/rankings${slug.length ? `/${slug.join("/")}` : ""}`);
}

export default async function RankingsPage({ params, searchParams }: { params: Promise<{ locale: string; slug?: string[] }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale, slug = [] } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const [categorySlug, countrySlug, citySlug] = slug;
  const categories = await listCategories();
  if (!categorySlug) {
    return (
      <div className="wrap">
        <section className="hero">
          <h1>{t(locale, "Rankings", "Rankings")}</h1>
          <p className="lede">{t(locale, "Elige una categoría. Después un país y, si quieres, una ciudad. Arriba verás los huecos patrocinados; debajo, las fichas orgánicas.", "Choose a category. Then a country and, if you want, a city. Sponsored slots sit on top; organic profiles sit below.")}</p>
        </section>
        <Flash locale={locale} ok={query.ok} error={query.error} />
        <div className="badges">{categories.map((category) => <Link key={category.id} className="badge" href={`/${locale}/rankings/${category.slug}`}>{categoryName(locale, category)}</Link>)}</div>
        <AdSlot slot="rankings-index" />
      </div>
    );
  }
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) notFound();
  const countries = await listCountries();
  if (!countrySlug) {
    return (
      <div className="wrap">
        <Breadcrumbs items={[{ href: `/${locale}/rankings`, label: "Rankings" }, { label: categoryName(locale, category) }]} />
        <section className="hero"><h1>{categoryName(locale, category)}</h1><p className="lede">{t(locale, "Elige el país del tablero.", "Choose the board’s country.")}</p></section>
        <div className="badges">{countries.map((country) => <Link key={country.id} className="badge" href={`/${locale}/rankings/${category.slug}/${country.slug}`}>{countryName(locale, country)}</Link>)}</div>
      </div>
    );
  }
  const country = countries.find((item) => item.slug === countrySlug);
  if (!country) notFound();
  const city = citySlug ? country.cities.find((item) => item.slug === citySlug) : null;
  if (citySlug && !city) notFound();
  const board = await loadBoard({ categoryId: category.id, countryId: country.id, cityId: city?.id || null });
  const place = city?.name || countryName(locale, country);
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ href: `/${locale}/rankings`, label: "Rankings" }, { href: `/${locale}/rankings/${category.slug}`, label: categoryName(locale, category) }, { label: place }]} />
      <section className="hero">
        <p className="kicker">{t(locale, "Patrocinado y orgánico", "Sponsored and organic")}</p>
        <h1>{categoryName(locale, category)} · {place}</h1>
        <p className="lede">{locale === "en" ? category.descriptionEn : category.descriptionEs}</p>
      </section>
      {!city ? (
        <div className="badges">{country.cities.map((item) => <Link key={item.id} className="badge" href={`/${locale}/rankings/${category.slug}/${country.slug}/${item.slug}`}>{item.name}</Link>)}</div>
      ) : null}
      <JsonLd data={[
        { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: siteName(), item: absolute(`/${locale}`) },
          { "@type": "ListItem", position: 2, name: "Rankings", item: absolute(`/${locale}/rankings`) },
          { "@type": "ListItem", position: 3, name: `${categoryName(locale, category)} · ${place}` },
        ] },
        { "@context": "https://schema.org", "@type": "ItemList", name: `${categoryName(locale, category)} · ${place}`, itemListElement: board.sponsored.map((slot, index) => ({ "@type": "ListItem", position: index + 1, name: slot.position })) },
      ]} />
      <RankingBoard locale={locale} board={board} categoryId={category.id} countryId={country.id} cityId={city?.id} />
      <p className="tiny">{t(locale, "La caducidad se revisa al abrir el ranking y con el cron /api/cron/expire.", "Expiry is checked when the ranking opens and by the /api/cron/expire job.")}</p>
      <AdSlot slot="ranking-board" format="sidebar" />
    </div>
  );
}
