import { ui } from "@/lib/i18n";

export function PremiumBadge({ locale }: { locale: string }) {
  return <span className="badge badge-premium">{ui(locale).premium}</span>;
}
