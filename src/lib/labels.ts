import { t } from "./i18n";

export function factorLabel(locale: string, factor: string) {
  if (factor === "verified") return t(locale, "Verificada", "Verified");
  if (factor === "claimed") return t(locale, "Reclamada", "Claimed");
  if (factor === "website") return t(locale, "Web", "Website");
  if (factor === "description") return t(locale, "Descripción", "Description");
  if (factor === "logo") return t(locale, "Logo", "Logo");
  if (factor.startsWith("technologies:")) return t(locale, "Tecnologías declaradas", "Declared technologies");
  if (factor.startsWith("offer:")) return t(locale, "Productos o servicios", "Products or services");
  return factor;
}

export function statusLabel(locale: string, status: string) {
  const map: Record<string, [string, string]> = {
    AVAILABLE: ["Disponible", "Available"],
    PENDING_PAYMENT: ["Pendiente de pago", "Pending payment"],
    ACTIVE: ["Activa", "Active"],
    EXPIRED: ["Caducada", "Expired"],
    CANCELLED: ["Cancelada", "Cancelled"],
    PAID: ["Pagado", "Paid"],
    FAILED: ["Fallido", "Failed"],
    REFUNDED: ["Reembolsado", "Refunded"],
    PENDING: ["Pendiente", "Pending"],
    APPROVED: ["Aprobada", "Approved"],
    REJECTED: ["Rechazada", "Rejected"],
    UNCLAIMED: ["Sin reclamar", "Unclaimed"],
    VERIFIED: ["Verificada", "Verified"],
    DRAFT: ["Borrador", "Draft"],
  };
  const pair = map[status];
  if (!pair) return status;
  return locale === "en" ? pair[1] : pair[0];
}
