import { CityCard } from "@/components/city-card";
import { listCities } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Ciudades", "Cities"), t(locale, "Ciudades de España y hubs europeos en TECHPODIO.", "Spanish cities and European hubs on TECHPODIO."), "/ciudades");
}

export default async function CitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const cities = await listCities();
  return (
    <div className="wrap">
      <section className="hero">
        <h1>{t(locale, "Ciudades", "Cities")}</h1>
        <p className="lede">{t(locale, "Semilla de ciudades españolas y hubs europeos. Las páginas de ciudad se generan desde la base de datos.", "Seed list of Spanish cities and European hubs. City pages are generated from the database.")}</p>
      </section>
      <div className="grid-cards">{cities.map((city) => <CityCard key={city.id} locale={locale} city={city} />)}</div>
    </div>
  );
}
