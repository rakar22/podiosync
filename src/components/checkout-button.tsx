import { t } from "@/lib/i18n";

export function CheckoutButton({ locale, disabled = false }: { locale: string; disabled?: boolean }) {
  return (
    <button className="btn checkout-button" type="submit" disabled={disabled}>
      {t(locale, "Continuar a Stripe", "Continue to Stripe")}
    </button>
  );
}
