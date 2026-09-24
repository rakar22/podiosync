import { Flash } from "@/components/flash";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";
import { legalIdentity, siteName } from "@/lib/site";
import { submitContact } from "@/server/actions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Contacto", "Contact"), t(locale, `Escribe a ${siteName()}.`, `Write to ${siteName()}.`), "/contacto");
}

export default async function ContactPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const locale = await readLocale(params);
  const query = await searchParams;
  const legal = legalIdentity();
  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <section className="hero">
        <h1>{t(locale, "Contacto", "Contact")}</h1>
        <p className="muted">{legal.email}</p>
        <p className="tiny">{t(locale, "Usa este formulario para corregir una ficha, pedir su supresión, ejercer derechos de privacidad o escribir sobre una posición patrocinada. El mensaje se guarda. No se envía un email automático salvo que Resend esté configurado para otros avisos.", "Use this form to correct a profile, ask for it to be removed, exercise privacy rights, or write about a sponsored position. The message is stored. An automatic email is not sent unless Resend is configured for other notices.")}</p>
      </section>
      <Flash locale={locale} ok={query.ok} error={query.error} />
      <form action={submitContact} className="form-grid">
        <input type="hidden" name="locale" value={locale} />
        <input type="text" name="website_hp" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
        <input className="input" name="name" required placeholder={t(locale, "Nombre", "Name")} aria-label={t(locale, "Nombre", "Name")} />
        <input className="input" type="email" name="email" required placeholder="Email" aria-label="Email" />
        <textarea className="textarea" name="message" required placeholder={t(locale, "Mensaje", "Message")} />
        <button className="btn" type="submit">{t(locale, "Enviar", "Send")}</button>
      </form>
    </div>
  );
}
