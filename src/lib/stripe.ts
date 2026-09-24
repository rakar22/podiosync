import Stripe from "stripe";
import { cleanEnv } from "./slug";

export const FULFILL_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export function stripeKey() {
  return cleanEnv(process.env.STRIPE_SECRET_KEY);
}

export function webhookSecret() {
  return cleanEnv(process.env.STRIPE_WEBHOOK_SECRET);
}

export function stripeMode(): "live" | "test" | "on" | "off" {
  const key = stripeKey();
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  if (key) return "on";
  return "off";
}

export function stripeEnabled() {
  return stripeMode() !== "off";
}

export function getStripe() {
  const key = stripeKey();
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY");
  return new Stripe(key);
}

export function sessionIsPaid(session: { payment_status?: string | null; status?: string | null } | null) {
  if (!session) return false;
  if (session.payment_status === "paid") return true;
  return session.status === "complete" && session.payment_status !== "unpaid";
}

export function amountMatches(session: { amount_total?: number | null; currency?: string | null }, cents: number, currency: string) {
  if (session.amount_total == null) return true;
  if (session.currency && session.currency.toLowerCase() !== currency.toLowerCase()) return false;
  return Number(session.amount_total) === cents;
}

export function publicPaymentError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err || "Error de pago");
  if (/Invalid API Key|invalid_api_key|api[_ ]key/i.test(message)) {
    return "Stripe rechazó la clave. Revisa STRIPE_SECRET_KEY.";
  }
  if (/Falta STRIPE_SECRET_KEY/i.test(message)) return message;
  if (/rate.?limit/i.test(message)) return "Stripe está saturado. Espera unos segundos y reintenta.";
  if (/connection|ECONNRESET|ETIMEDOUT|ENOTFOUND|network/i.test(message)) {
    return "No pudimos hablar con Stripe. Reintenta en unos segundos.";
  }
  if (message.length > 180) return "Stripe no pudo completar el pago.";
  return message;
}
