import { CountryCard } from "@/components/country-card";
import { listCountries } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Países", "Countries"), t(locale, "Unión Europea y Reino Unido en TECHPODIO.", "The European Union and the United Kingdom on TECHPODIO."), "/paises");
}

export default async function CountriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const countries = await listCountries();
  return (
    <div className="wrap">
      <section className="hero">
        <h1>{t(locale, "Países", "Countries")}</h1>
        <p className="lede">{t(locale, "El directorio arranca en España y cubre la Unión Europea y el Reino Unido. Cada país tiene un ranking nacional y, donde hay ciudades semilla, rankings locales.", "The directory starts in Spain and covers the European Union and the United Kingdom. Each country has a national ranking and, where seed cities exist, local rankings.")}</p>
      </section>
      <div className="grid-cards">{countries.map((country) => <CountryCard key={country.id} locale={locale} country={country} />)}</div>
    </div>
  );
}
