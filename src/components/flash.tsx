import { t } from "@/lib/i18n";

const errors: Record<string, [string, string]> = {
  invalid: ["Revisa los datos del formulario.", "Check the form data."],
  rate: ["Demasiados intentos. Espera un momento.", "Too many attempts. Wait a moment."],
  exists: ["Ese email ya tiene cuenta.", "That email already has an account."],
  credentials: ["Email o contraseña incorrectos.", "Wrong email or password."],
  waitlist: ["No hemos podido guardar el aviso.", "We could not save the alert."],
  lead: ["No hemos podido enviar el mensaje.", "We could not send the message."],
  evidence: ["Cuéntanos con un poco más de detalle cómo representas a la empresa.", "Tell us a little more about how you represent the company."],
  name: ["El nombre es demasiado corto.", "The name is too short."],
  active: ["Hay una campaña activa. Espera a que termine o escríbenos.", "There is an active campaign. Wait until it ends or contact us."],
  same: ["Elige dos fichas distintas.", "Choose two different profiles."],
  missing: ["No encontramos esas fichas.", "We could not find those profiles."],
  slot: ["Las dos fichas ocupan la misma posición activa. No las fusionamos.", "Both profiles hold the same active position. They were not merged."],
  role: ["Rol no válido.", "Invalid role."],
  STRIPE_NOT_CONFIGURED: ["Los pagos están pendientes de configuración. Stripe no tiene clave en el servidor, así que el checkout no se abre.", "Payments are pending setup. Stripe has no key on the server, so checkout does not open."],
  PRICE: ["El precio tiene que estar entre 100 céntimos y 10.000.000.", "The price must be between 100 cents and 10,000,000."],
  DURATION: ["La duración tiene que ser de 1 a 3650 días.", "Duration must be from 1 to 3650 days."],
  CURRENCY: ["La moneda tiene que ser un código de tres letras, por ejemplo eur.", "Currency must be a three-letter code, for example eur."],
  CITY: ["Una regla de ciudad necesita también el país.", "A city rule also needs the country."],
  POSITION: ["Esa posición no existe.", "That position does not exist."],
  OCCUPIED: ["Esa posición está ocupada ahora mismo.", "That position is occupied right now."],
  NO_PRICE: ["No hay una tarifa activa para esa combinación.", "There is no active price for that combination."],
  COMPANY: ["Indica el nombre y una web que empiece por https://.", "Add a name and a website starting with https://."],
  FORBIDDEN: ["No puedes comprar para esa empresa.", "You cannot buy for that company."],
};

export function Flash({ locale, ok, error }: { locale: string; ok?: string; error?: string }) {
  if (ok) {
    const text = ok === "waitlist"
      ? t(locale, "Te avisaremos cuando la posición quede libre. Si no hay proveedor de email, el aviso queda en la bandeja de administración.", "We will notify you when the position is free. Without an email provider, the notice stays in the admin outbox.")
      : t(locale, "Hecho.", "Done.");
    return <p className="success">{text}</p>;
  }
  if (!error) return null;
  const known = errors[error];
  return <p className="error">{known ? (locale === "en" ? known[1] : known[0]) : error}</p>;
}
