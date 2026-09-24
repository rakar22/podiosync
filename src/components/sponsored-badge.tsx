import { ui } from "@/lib/i18n";

export function SponsoredBadge({ locale }: { locale: string }) {
  return <span className="badge badge-sponsored">{ui(locale).sponsored}</span>;
}
