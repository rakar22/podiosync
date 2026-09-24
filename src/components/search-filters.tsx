import { categoryName, countryName, t } from "@/lib/i18n";

export function SearchFilters({
  locale,
  q,
  categories,
  countries,
  cities,
  technologies,
  selected,
}: {
  locale: string;
  q?: string;
  selected: { categoria?: string; pais?: string; ciudad?: string; tecnologia?: string; verificada?: string };
  categories: { slug: string; nameEs: string; nameEn: string }[];
  countries: { slug: string; nameEs: string; nameEn: string }[];
  cities: { slug: string; name: string }[];
  technologies: { slug: string; name: string }[];
}) {
  return (
    <form className="filters" action={`/${locale}/buscar`} method="get">
      <input type="hidden" name="q" value={q || ""} />
      <label className="field"><span className="label">{t(locale, "Categoría", "Category")}</span>
        <select className="select" name="categoria" defaultValue={selected.categoria || ""}>
          <option value="">{t(locale, "Todas", "All")}</option>
          {categories.map((item) => <option key={item.slug} value={item.slug}>{categoryName(locale, item)}</option>)}
        </select>
      </label>
      <label className="field"><span className="label">{t(locale, "País", "Country")}</span>
        <select className="select" name="pais" defaultValue={selected.pais || ""}>
          <option value="">{t(locale, "Todos", "All")}</option>
          {countries.map((item) => <option key={item.slug} value={item.slug}>{countryName(locale, item)}</option>)}
        </select>
      </label>
      <label className="field"><span className="label">{t(locale, "Ciudad", "City")}</span>
        <select className="select" name="ciudad" defaultValue={selected.ciudad || ""}>
          <option value="">{t(locale, "Todas", "All")}</option>
          {cities.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
      </label>
      <label className="field"><span className="label">{t(locale, "Tecnología", "Technology")}</span>
        <select className="select" name="tecnologia" defaultValue={selected.tecnologia || ""}>
          <option value="">{t(locale, "Todas", "All")}</option>
          {technologies.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
      </label>
      <label className="field"><span className="label">{t(locale, "Verificación", "Verification")}</span>
        <select className="select" name="verificada" defaultValue={selected.verificada || ""}>
          <option value="">{t(locale, "Todas", "All")}</option>
          <option value="1">{t(locale, "Solo verificadas", "Verified only")}</option>
        </select>
      </label>
      <button className="btn" type="submit">{t(locale, "Filtrar", "Filter")}</button>
    </form>
  );
}
