"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";

export function CookieConsent({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!document.cookie.includes("tp_consent=")) setOpen(true);
  }, []);
  if (!open) return null;
  function choose(value: string) {
    document.cookie = `tp_consent=${value}; path=/; max-age=15552000; samesite=lax`;
    setOpen(false);
  }
  return (
    <div className="cookie" role="dialog" aria-label="Cookies">
      <p>{t(locale, "Usamos una cookie necesaria de sesión. La analítica de producto y los espacios publicitarios solo se activan si lo aceptas. Las posiciones patrocinadas no dependen de esta cookie.", "We use a necessary session cookie. Product analytics and ad slots run only if you accept them. Sponsored positions do not depend on this cookie.")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-small" type="button" onClick={() => choose("all")}>{t(locale, "Aceptar analítica", "Accept analytics")}</button>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => choose("necessary")}>{t(locale, "Solo necesarias", "Necessary only")}</button>
      </div>
    </div>
  );
}
