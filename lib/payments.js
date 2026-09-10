import crypto from "node:crypto";
import QRCode from "qrcode";
import { fulfillPaid, getPendingRow, putPending } from "./store.js";

const DESCRIPTION_MAX = 200;
const CORRELATION_MAX = 40;
const WEBHOOK_SECRET_MIN = 10;
const WEBHOOK_SECRET_MAX = 50;

export function strikeApiKey() {
  return (process.env.STRIKE_API_KEY || "").trim();
}

export function strikeApiBase() {
  let base = (process.env.STRIKE_API_BASE || "https://api.strike.me").trim().replace(/\/$/, "");
  if (base.endsWith("/v1")) base = base.slice(0, -3).replace(/\/$/, "");
  return base || "https://api.strike.me";
}

export function strikeMode() {
  if (!strikeApiKey()) return "off";
  const host = strikeApiBase().toLowerCase();
  if (host.includes("api.dev.strike.me") || host.includes("dev.strike.me")) return "test";
  return "live";
}

export function strikeEnabled() {
  return strikeMode() !== "off";
}

export function webhookSecret() {
  return (process.env.STRIKE_WEBHOOK_SECRET || "").trim();
}

export function originFrom(req) {
  const env = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  if (env) return env;
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https")
    .split(",")[0]
    .trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  if (!host) return "";
  return `${proto}://${host}`;
}

function clip(v, n) {
  return String(v ?? "").slice(0, n);
}

export function newClaimId() {
  return crypto.randomUUID();
}

export function metadataFromPayload(claimId, payload, charged) {
  return {
    claim_id: clip(claimId, 80),
    handle: clip(payload.handle, 80),
    displayName: clip(payload.displayName, 80),
    tagline: clip(payload.tagline, 80),
    description: clip(payload.description, 400),
    url: clip(payload.url, 200),
    platform: clip(payload.platform || "instagram", 20),
    country: clip(payload.country || "ES", 4),
    category: clip(payload.category, 40),
    targetTotal: String(payload.targetTotal),
    charged: String(charged),
  };
}

export function payloadFromMetadata(meta) {
  if (!meta?.handle || !meta?.displayName) return null;
  return {
    handle: meta.handle,
    displayName: meta.displayName,
    tagline: meta.tagline || "",
    description: meta.description || "",
    url: meta.url || "",
    platform: meta.platform || "instagram",
    country: meta.country || "ES",
    category: meta.category,
    targetTotal: Number(meta.targetTotal),
  };
}

function compactMeta(payload, charged) {
  return {
    h: clip(payload.handle, 40),
    n: clip(payload.displayName, 40),
    t: String(payload.targetTotal),
    x: String(charged),
    p: clip(payload.platform || "instagram", 16),
    c: clip(payload.country || "ES", 4),
    k: clip(payload.category, 32),
    g: clip(payload.tagline, 40),
    u: clip(payload.url, 80),
    d: clip(payload.description, 80),
  };
}

export function invoiceDescription(payload, charged) {
  const handle = clip(payload.handle, 32);
  const human = clip(`podiosync · ${handle} · total $${payload.targetTotal}`, 72);
  const variants = [
    compactMeta(payload, charged),
    {
      h: clip(payload.handle, 32),
      n: clip(payload.displayName, 32),
      t: String(payload.targetTotal),
      x: String(charged),
      p: clip(payload.platform || "instagram", 12),
      c: clip(payload.country || "ES", 4),
      k: clip(payload.category, 24),
    },
    {
      h: clip(payload.handle, 32),
      n: clip(payload.displayName, 32),
      t: String(payload.targetTotal),
      x: String(charged),
    },
  ];
  for (const meta of variants) {
    const json = JSON.stringify(meta);
    const full = `${human}\n${json}`;
    if (full.length <= DESCRIPTION_MAX) return full;
  }
  return human.slice(0, DESCRIPTION_MAX);
}

export function payloadFromInvoice(invoice) {
  const desc = String(invoice?.description || "");
  const nl = desc.indexOf("\n");
  if (nl >= 0) {
    try {
      const raw = JSON.parse(desc.slice(nl + 1));
      if (raw?.h && raw?.n) {
        return payloadFromMetadata({
          handle: raw.h,
          displayName: raw.n,
          tagline: raw.g,
          description: raw.d,
          url: raw.u,
          platform: raw.p,
          country: raw.c,
          category: raw.k,
          targetTotal: raw.t,
          charged: raw.x,
        });
      }
    } catch {
      // fall through
    }
  }
  return payloadFromMetadata(invoice?.metadata);
}

export function usdAmount(charged) {
  const n = Number(charged);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Importe inválido.");
  return n.toFixed(2);
}

export function amountMatches(invoice, charged) {
  if (charged == null || charged === "") return true;
  const currency = String(invoice?.amount?.currency || "").toUpperCase();
  if (currency && currency !== "USD") return false;
  const paid = Number(invoice?.amount?.amount);
  const expected = Number(charged);
  if (!Number.isFinite(paid) || !Number.isFinite(expected)) return false;
  return Math.abs(paid - expected) < 0.009;
}

export function invoiceIsPaid(invoice) {
  return String(invoice?.state || "").toUpperCase() === "PAID";
}

export function strikePayUrl(invoiceId) {
  const mode = strikeMode();
  const host = mode === "test" ? "https://dev.strike.me" : "https://strike.me";
  return `${host}/pay/${encodeURIComponent(invoiceId)}`;
}

function strikeErrorMessage(data, status) {
  return (
    data?.data?.message ||
    data?.message ||
    (status ? `Strike HTTP ${status}` : "Error de Strike")
  );
}

export async function strikeFetch(path, { method = "GET", body } = {}) {
  const key = strikeApiKey();
  if (!key) throw new Error("Falta STRIKE_API_KEY");
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${key}`,
  };
  const opts = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const url = `${strikeApiBase()}/v1${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(strikeErrorMessage(data, res.status));
    err.status = res.status;
    err.code = data?.data?.code;
    err.details = data;
    throw err;
  }
  return data;
}

export async function createInvoice({ claimId, payload, charged }) {
  const correlationId = clip(claimId, CORRELATION_MAX);
  if (!correlationId) throw new Error("Falta correlation id.");
  return strikeFetch("/invoices", {
    method: "POST",
    body: {
      correlationId,
      description: invoiceDescription(payload, charged),
      amount: {
        currency: "USD",
        amount: usdAmount(charged),
      },
    },
  });
}

export async function quoteInvoice(invoiceId) {
  return strikeFetch(`/invoices/${encodeURIComponent(invoiceId)}/quote`, {
    method: "POST",
  });
}

export async function retrieveInvoice(invoiceId) {
  return strikeFetch(`/invoices/${encodeURIComponent(invoiceId)}`);
}

export async function createPayment({ claimId, payload, charged }) {
  const invoice = await createInvoice({ claimId, payload, charged });
  const meta = metadataFromPayload(claimId, payload, charged);
  putPending(claimId, payload, { charged, invoiceId: invoice.invoiceId, meta });
  putPending(invoice.invoiceId, payload, { charged, claimId, meta });
  let quote = null;
  try {
    quote = await quoteInvoice(invoice.invoiceId);
  } catch (err) {
    quote = { error: err.message };
  }
  return { invoice, quote };
}

export async function qrSvg(text) {
  if (!text) return "";
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    width: 280,
    errorCorrectionLevel: "M",
  });
}

function pendingForInvoice(invoice) {
  return getPendingRow(invoice?.invoiceId) || getPendingRow(invoice?.correlationId) || null;
}

export async function confirmPaidClaim(invoiceId) {
  if (!invoiceId) return { ok: false, error: "Falta invoice_id." };
  const invoice = await retrieveInvoice(invoiceId);
  if (!invoiceIsPaid(invoice)) {
    return { ok: false, waiting: true, invoice };
  }
  const row = pendingForInvoice(invoice);
  const payload = row?.payload || payloadFromInvoice(invoice);
  if (!payload) {
    return { ok: false, paid: true, missing: true, invoice };
  }
  const charged = row?.charged ?? row?.meta?.charged;
  if (!amountMatches(invoice, charged)) {
    return { ok: false, error: "El importe cobrado no coincide con la reclamación.", invoice };
  }
  const result = fulfillPaid(invoice.invoiceId, payload);
  return { ...result, invoice, paid: true };
}

export function parseWebhook(rawBody, signature) {
  const secret = webhookSecret();
  if (!secret) throw new Error("Falta STRIKE_WEBHOOK_SECRET");
  if (secret.length < WEBHOOK_SECRET_MIN || secret.length > WEBHOOK_SECRET_MAX) {
    throw new Error(
      `STRIKE_WEBHOOK_SECRET debe tener entre ${WEBHOOK_SECRET_MIN} y ${WEBHOOK_SECRET_MAX} caracteres.`,
    );
  }
  const sig = String(signature || "")
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();
  if (!/^[0-9a-f]+$/.test(sig)) throw new Error("Firma de webhook inválida");
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""), "utf8");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Firma de webhook inválida");
  }
  return JSON.parse(body.toString("utf8"));
}

export async function ensureWebhookSubscription(origin) {
  const secret = webhookSecret();
  if (!strikeEnabled() || !secret || !origin) return { skipped: true };
  if (secret.length < WEBHOOK_SECRET_MIN || secret.length > WEBHOOK_SECRET_MAX) {
    console.warn(
      `[strike] STRIKE_WEBHOOK_SECRET debe tener ${WEBHOOK_SECRET_MIN}–${WEBHOOK_SECRET_MAX} caracteres; no se registra el webhook.`,
    );
    return { skipped: true };
  }
  const webhookUrl = `${origin.replace(/\/$/, "")}/webhook/strike`;
  let items = [];
  try {
    const list = await strikeFetch("/subscriptions");
    items = Array.isArray(list) ? list : list?.items || [];
  } catch (err) {
    console.warn(`[strike] no se pudieron listar webhooks: ${err.message}`);
  }
  const already = items.find(
    (s) => String(s.webhookUrl || "").replace(/\/$/, "") === webhookUrl && s.enabled !== false,
  );
  if (already) {
    const types = already.eventTypes || already.eventType || [];
    const hasInvoice = Array.isArray(types) ? types.includes("invoice.updated") : types === "invoice.updated";
    if (hasInvoice || !types.length) return { ok: true, existing: already.id || true };
  }
  const created = await strikeFetch("/subscriptions", {
    method: "POST",
    body: {
      webhookUrl,
      webhookVersion: "v1",
      secret,
      enabled: true,
      eventTypes: ["invoice.updated"],
    },
  });
  return { ok: true, created: created?.id || true };
}
