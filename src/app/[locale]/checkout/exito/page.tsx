import Link from "next/link";
import { fulfillCheckoutSession } from "@/lib/checkout";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";
import { publicPaymentError } from "@/lib/stripe";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Pago", "Payment"), "TECHPODIO", "/checkout/exito", false);
}

export default async function SuccessPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const locale = await readLocale(params);
  const query = await searchParams;
  let conflict = false;
  let waiting = false;
  let failed = "";
  if (!query.session_id) failed = t(locale, "Falta la sesión de Stripe.", "The Stripe session is missing.");
  else {
    try {
      const result = await fulfillCheckoutSession(query.session_id);
      conflict = Boolean("conflict" in result && result.conflict);
      waiting = Boolean("waiting" in result && result.waiting);
      if ("error" in result && result.error) failed = result.error;
    } catch (error) {
      failed = publicPaymentError(error);
    }
  }
  return (
    <div className="wrap prose">
      <h1>{conflict ? t(locale, "Pago recibido, hueco no asignado", "Payment received, slot not assigned") : waiting ? t(locale, "Pago pendiente", "Payment pending") : failed ? t(locale, "No hemos podido confirmar", "We could not confirm") : t(locale, "Posición activa", "Position active")}</h1>
      <p>
        {conflict
          ? t(locale, "Stripe cobró, pero la posición dejó de estar libre. No hemos ocupado el hueco de otra empresa. Escríbenos para el reembolso.", "Stripe charged the card, but the position was no longer free. We did not take another company’s slot. Contact us about a refund.")
          : waiting
            ? t(locale, "Stripe todavía no marca el pago como cobrado. Si acaba de confirmarse, recarga en unos segundos. El webhook también activará la campaña.", "Stripe does not mark the payment as paid yet. If it just completed, reload in a few seconds. The webhook will also activate the campaign.")
            : failed
              ? failed
              : t(locale, "La campaña está activa. La verás en el ranking etiquetada como patrocinada.", "The campaign is active. You will see it on the ranking labelled as sponsored.")}
      </p>
      <Link className="btn" href={`/${locale}/dashboard/posiciones`}>{t(locale, "Ir a mis posiciones", "Go to my positions")}</Link>
    </div>
  );
}
