import Link from "next/link";
import { BuyForm } from "@/components/buy-form";
import { Flash } from "@/components/flash";
import { currentUser } from "@/lib/auth";
import { activeRules, listCategories, listCities, listCountries } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";
import { stripeMode } from "@/lib/stripe";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Comprar posición", "Buy a position"), t(locale, "Checkout de una posición patrocinada a precio fijo.", "Checkout for a fixed-price sponsored position."), "/comprar", false);
}

export default async function BuyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const locale = await readLocale(params);
  const query = await searchParams;
  const user = await currentUser();
  const [categories, countries, cities, rules] = await Promise.all([listCategories(), listCountries(), listCities(), activeRules()]);
  return (
    <div className="wrap">
      <section className="hero">
        <h1>{t(locale, "Comprar una posición", "Buy a position")}</h1>
        <p className="lede">{t(locale, "El precio se resuelve al pagar. Si alguien ocupa el hueco antes de que Stripe confirme, no activamos la campaña encima de otra empresa.", "The price is resolved at payment. If someone takes the slot before Stripe confirms, we do not activate a campaign on top of another company.")}</p>
        <p className="tiny">Stripe: {stripeMode()}</p>
      </section>
      <Flash locale={locale} error={query.error} />
      {user ? (
        <BuyForm
          locale={locale}
          categories={categories}
          countries={countries}
          cities={cities.map((city) => ({ id: city.id, name: city.name, countryId: city.countryId }))}
          rules={rules}
          companies={user.memberships.map((member) => ({ id: member.company.id, name: member.company.name }))}
          initial={query}
          error={query.error}
        />
      ) : (
        <p><Link className="btn" href={`/${locale}/login?next=/${locale}/comprar`}>{t(locale, "Entra para continuar", "Log in to continue")}</Link></p>
      )}
    </div>
  );
}
