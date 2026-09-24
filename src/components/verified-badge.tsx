import { ui } from "@/lib/i18n";

export function VerifiedBadge({ locale }: { locale: string }) {
  return <span className="badge badge-verified">{ui(locale).verified}</span>;
}
