export type Consent = {
  necessary: true;
  analytics: boolean;
  ads: boolean;
};

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  value = value.trim().toLowerCase();
  if (!value) return null;
  if (value === "all") return { necessary: true, analytics: true, ads: true };
  if (value === "necessary") return { necessary: true, analytics: false, ads: false };
  const parts = new Set(value.split(/[.,\s]+/).filter(Boolean));
  if (!parts.has("v1") && !parts.has("necessary") && !parts.has("analytics") && !parts.has("ads")) return null;
  return {
    necessary: true,
    analytics: parts.has("analytics"),
    ads: parts.has("ads"),
  };
}

export function serializeConsent(choice: { analytics: boolean; ads: boolean }) {
  const parts = ["v1", "necessary"];
  if (choice.analytics) parts.push("analytics");
  if (choice.ads) parts.push("ads");
  return parts.join(".");
}

export function consentAllowsAnalytics(raw: string | null | undefined) {
  return Boolean(parseConsent(raw)?.analytics);
}

export function consentAllowsAds(raw: string | null | undefined) {
  return Boolean(parseConsent(raw)?.ads);
}

export function readConsentCookie(cookieHeader: string) {
  const match = cookieHeader.match(/(?:^|; )tp_consent=([^;]*)/);
  return match ? match[1] : null;
}
