"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { consentAllowsAds, readConsentCookie } from "@/lib/consent";

export function AdSlot({ slot, format = "banner" }: { slot: string; format?: "banner" | "infeed" | "sidebar" }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(Boolean(client) && consentAllowsAds(readConsentCookie(document.cookie)));
  }, [client]);

  if (!client || !allowed) {
    return <div className="ad-slot-idle" data-ad-slot={slot} data-ad-format={format} data-ads="blocked" hidden />;
  }

  return (
    <aside className={`ad-slot ad-slot-${format}`} aria-label="Publicidad">
      <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`} crossOrigin="anonymous" strategy="afterInteractive" />
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format === "infeed" ? "fluid" : "auto"}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
