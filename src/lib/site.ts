export function publicOrigin() {
  return (process.env.PUBLIC_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function legalIdentity() {
  return {
    name: process.env.LEGAL_ENTITY_NAME?.trim() || "",
    taxId: process.env.LEGAL_TAX_ID?.trim() || "",
    address: process.env.LEGAL_ADDRESS?.trim() || "",
    email: process.env.CONTACT_EMAIL?.trim() || "",
  };
}

export const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const;

export const SIGNAL_KINDS = ["product", "hiring", "regulation", "partnership", "open-source", "other"] as const;
