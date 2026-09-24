"use client";

import { useEffect } from "react";

export function AnalyticsBeacon({ locale, path }: { locale: string; path: string }) {
  useEffect(() => {
    if (!document.cookie.includes("tp_consent=all")) return;
    const payload = JSON.stringify({ name: "page_view", path, locale });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
      return;
    }
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: payload });
  }, [locale, path]);
  return null;
}
