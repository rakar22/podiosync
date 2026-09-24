"use client";

import { useMemo, useState } from "react";
import { CheckoutButton } from "./checkout-button";
import { categoryName, countryName, positionLabel, t } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { POSITION_KEYS, resolvePrice, type PriceCandidate } from "@/lib/positions";
import { startCheckout } from "@/server/actions";

type Option = { id: string; slug: string; nameEs: string; nameEn: string };
type City = { id: string; name: string; countryId: string };

export function BuyForm({
  locale,
  categories,
  countries,
  cities,
  rules,
  companies,
  initial,
  error,
}: {
  locale: string;
  categories: Option[];
  countries: Option[];
  cities: City[];
  rules: PriceCandidate[];
  companies: { id: string; name: string }[];
  initial: { categoryId?: string; countryId?: string; cityId?: string; position?: string };
  error?: string;
}) {
  const [categoryId, setCategoryId] = useState(initial.categoryId || categories[0]?.id || "");
  const [countryId, setCountryId] = useState(initial.countryId || countries.find((item) => item.slug === "espana")?.id || countries[0]?.id || "");
  const [cityId, setCityId] = useState(initial.cityId || "");
  const [position, setPosition] = useState(initial.position || "RANK_1");
  const [durationDays, setDurationDays] = useState(30);
  const [companyMode, setCompanyMode] = useState(companies.length ? "existing" : "new");
  const visibleCities = cities.filter((city) => city.countryId === countryId);
  const durations = useMemo(() => {
    const set = new Set<number>();
    for (const rule of rules) {
      if (rule.position === position) set.add(rule.durationDays);
    }
    return [...set].sort((a, b) => a - b);
  }, [rules, position]);
  const selectedDuration = durations.includes(durationDays) ? durationDays : durations[0] || 30;
  const price = resolvePrice(rules, { position, categoryId, countryId, cityId: cityId || null, durationDays: selectedDuration });

  return (
    <form action={startCheckout} className="form-grid">
      <input type="hidden" name="locale" value={locale} />
      {error ? <p className="error">{error}</p> : null}
      <label className="field"><span className="label">{t(locale, "Categoría", "Category")}</span>
        <select className="select" name="categoryId" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          {categories.map((item) => <option key={item.id} value={item.id}>{categoryName(locale, item)}</option>)}
        </select>
      </label>
      <div className="form-grid two">
        <label className="field"><span className="label">{t(locale, "País", "Country")}</span>
          <select className="select" name="countryId" value={countryId} onChange={(event) => { setCountryId(event.target.value); setCityId(""); }}>
            {countries.map((item) => <option key={item.id} value={item.id}>{countryName(locale, item)}</option>)}
          </select>
        </label>
        <label className="field"><span className="label">{t(locale, "Ciudad (vacío = país entero)", "City (empty = whole country)")}</span>
          <select className="select" name="cityId" value={cityId} onChange={(event) => setCityId(event.target.value)}>
            <option value="">{t(locale, "Todo el país", "Entire country")}</option>
            {visibleCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
        </label>
      </div>
      <div className="form-grid two">
        <label className="field"><span className="label">{t(locale, "Posición", "Position")}</span>
          <select className="select" name="position" value={position} onChange={(event) => setPosition(event.target.value)}>
            {POSITION_KEYS.map((key) => <option key={key} value={key}>{positionLabel(locale, key)}</option>)}
          </select>
        </label>
        <label className="field"><span className="label">{t(locale, "Duración", "Duration")}</span>
          <select className="select" name="durationDays" value={selectedDuration} onChange={(event) => setDurationDays(Number(event.target.value))}>
            {durations.map((days) => <option key={days} value={days}>{days} {t(locale, "días", "days")}</option>)}
          </select>
        </label>
      </div>
      <p><strong>{price ? formatMoney(price.priceCents, price.currency, locale) : t(locale, "No hay tarifa para esta combinación.", "There is no price for this combination.")}</strong></p>
      <p className="tiny">{t(locale, "El servidor vuelve a leer el precio al crear el pago. Un admin puede cambiarlo sin redeploy.", "The server reads the price again when the payment is created. An admin can change it without a redeploy.")}</p>
      {companies.length ? (
        <label className="field"><span className="label">{t(locale, "Empresa", "Company")}</span>
          <select className="select" name="companyMode" value={companyMode} onChange={(event) => setCompanyMode(event.target.value)}>
            <option value="existing">{t(locale, "Usar una empresa mía", "Use one of my companies")}</option>
            <option value="new">{t(locale, "Crear una ficha nueva", "Create a new profile")}</option>
          </select>
        </label>
      ) : <input type="hidden" name="companyMode" value="new" />}
      {companyMode === "existing" ? (
        <label className="field"><span className="label">{t(locale, "Ficha", "Profile")}</span>
          <select className="select" name="companyId" defaultValue={companies[0]?.id}>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
        </label>
      ) : (
        <>
          <input className="input" name="newCompanyName" placeholder={t(locale, "Nombre de la empresa", "Company name")} aria-label={t(locale, "Nombre de la empresa", "Company name")} />
          <input className="input" name="newCompanyWebsite" placeholder="https://" aria-label={t(locale, "Sitio web", "Website")} />
        </>
      )}
      <CheckoutButton locale={locale} disabled={!price} />
    </form>
  );
}
