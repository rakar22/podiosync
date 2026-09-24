import { Flash } from "@/components/flash";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";
import { legalIdentity } from "@/lib/site";
import { submitContact } from "@/server/actions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Contacto", "Contact"), t(locale, "Escribe a TECHPODIO.", "Write to TECHPODIO."), "/contacto");
}

export default async function ContactPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const locale = await readLocale(params);
  const query = await searchParams;
  const legal = legalIdentity();
  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <section className="hero">
        <h1>{t(locale, "Contacto", "Contact")}</h1>
        {legal.email ? <p className="muted">{legal.email}</p> : <p className="muted">{t(locale, "Configura CONTACT_EMAIL para publicar un correo. El formulario guarda el mensaje.", "Set CONTACT_EMAIL to publish an address. The form stores the message.")}</p>}
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
