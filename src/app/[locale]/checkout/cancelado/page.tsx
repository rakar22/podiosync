import Link from "next/link";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Pago cancelado", "Payment cancelled"), "TECHPODIO", "/checkout/cancelado", false);
}

export default async function CancelPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return (
    <div className="wrap prose">
      <h1>{t(locale, "Pago cancelado", "Payment cancelled")}</h1>
      <p>{t(locale, "No se ha cobrado la posición. La reserva temporal caduca sola.", "The position was not charged. The temporary hold expires on its own.")}</p>
      <Link className="btn" href={`/${locale}/comprar`}>{t(locale, "Volver a elegir", "Choose again")}</Link>
    </div>
  );
}
