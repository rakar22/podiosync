export function formatMoney(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function daysLeft(end: Date | null | undefined, now = new Date()) {
  if (!end) return null;
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function renewalSentence(locale: string, positionName: string, days: number) {
  const label = positionName.charAt(0).toLowerCase() + positionName.slice(1);
  if (locale === "en") return `Your ${label} ends in ${days} days.`;
  return `Tu ${label} termina en ${days} días.`;
}
