"use client";

import { useEffect, useState } from "react";
import { serializeConsent, parseConsent } from "@/lib/consent";
import { t } from "@/lib/i18n";

const MAX_AGE = 60 * 60 * 24 * 180;

function writeConsent(value: string) {
  document.cookie = `tp_consent=${value}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

export function CookieConsent({ locale, siteName }: { locale: string; siteName: string }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )tp_consent=([^;]*)/);
    if (!parseConsent(match?.[1])) setOpen(true);
  }, []);

  if (!open) return null;

  function save(choice: { analytics: boolean; ads: boolean }) {
    writeConsent(serializeConsent(choice));
    setOpen(false);
  }

  return (
    <div className="cookie" role="dialog" aria-label="Cookies">
      <p>
        {t(
          locale,
          `${siteName} usa una cookie de sesión necesaria. Analítica de producto y publicidad (AdSense, si está activada) solo corren si las aceptas. Las posiciones patrocinadas no dependen de estas cookies.`,
          `${siteName} uses a necessary session cookie. Product analytics and advertising (AdSense, if enabled) run only if you accept them. Sponsored positions do not depend on these cookies.`,
        )}
      </p>
      {prefs ? (
        <div className="cookie-prefs">
          <label><input type="checkbox" checked disabled /> {t(locale, "Necesarias (sesión)", "Necessary (session)")}</label>
          <label><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /> {t(locale, "Analítica de producto", "Product analytics")}</label>
          <label><input type="checkbox" checked={ads} onChange={(event) => setAds(event.target.checked)} /> {t(locale, "Publicidad", "Advertising")}</label>
        </div>
      ) : null}
      <div className="cookie-actions">
        <button className="btn btn-small" type="button" onClick={() => save({ analytics: true, ads: true })}>{t(locale, "Aceptar", "Accept")}</button>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => save({ analytics: false, ads: false })}>{t(locale, "Rechazar no esenciales", "Reject non-essential")}</button>
        {prefs ? (
          <button className="btn btn-ghost btn-small" type="button" onClick={() => save({ analytics, ads })}>{t(locale, "Guardar preferencias", "Save preferences")}</button>
        ) : (
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setPrefs(true)}>{t(locale, "Preferencias", "Preferences")}</button>
        )}
      </div>
    </div>
  );
}
