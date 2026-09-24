import Link from "next/link";
import { t } from "@/lib/i18n";

export function Pager({ locale, page, total, pageSize, path }: { locale: string; page: number; total: number; pageSize: number; path: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const join = path.includes("?") ? "&" : "?";
  return (
    <div className="pager">
      {page > 1 ? <Link className="btn btn-ghost btn-small" href={`${path}${join}page=${page - 1}`}>{t(locale, "Anterior", "Previous")}</Link> : null}
      <span className="tiny">{page} / {pages}</span>
      {page < pages ? <Link className="btn btn-ghost btn-small" href={`${path}${join}page=${page + 1}`}>{t(locale, "Siguiente", "Next")}</Link> : null}
    </div>
  );
}
