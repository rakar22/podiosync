import { t } from "@/lib/i18n";

export function SearchBar({ locale, initial = "" }: { locale: string; initial?: string }) {
  return (
    <form className="search" action={`/${locale}/buscar`} method="get" role="search">
      <label className="sr-only" htmlFor="q" style={{ position: "absolute", left: "-999px" }}>
        {t(locale, "Buscar empresas", "Search companies")}
      </label>
      <input id="q" name="q" defaultValue={initial} placeholder={t(locale, "Busca una empresa, categoría o tecnología", "Search a company, category, or technology")} />
      <button className="btn" type="submit">{t(locale, "Buscar", "Search")}</button>
    </form>
  );
}
