import { legalIdentity } from "@/lib/site";
import { t } from "@/lib/i18n";

const docs = {
  privacy: {
    es: {
      title: "Privacidad",
      body: [
        "TECHPODIO trata datos para prestar el directorio, las cuentas y los pagos de posiciones patrocinadas.",
        "Responsable: la identidad publicada en el aviso legal (variables LEGAL_ENTITY_NAME, LEGAL_TAX_ID y LEGAL_ADDRESS). Si están vacías, el sitio todavía no ha configurado al responsable.",
        "Datos de cuenta: email, nombre, hash de contraseña y rol. Datos de empresa: los que la propia empresa escribe en su ficha. Datos de pago: identificadores de Stripe, importe y estado. No guardamos el número de tarjeta.",
        "Leads y contacto: nombre, email y mensaje que nos envías. Reclamaciones: el texto y el email corporativo que aportes.",
        "Analítica de producto: solo si aceptas la cookie de analítica. Registramos el tipo de evento, la ruta y, si has iniciado sesión, tu identificador. Los cobros y las reclamaciones se registran aunque rechaces la analítica porque son necesarios para el contrato.",
        "Base jurídica: ejecución del contrato, interés legítimo en la seguridad del servicio y consentimiento para analítica y publicidad.",
        "Destinatarios: Stripe para el cobro. Si configuras RESEND_API_KEY, el email de avisos de huecos libres sale por ese proveedor. No vendemos ficheros.",
        "Conservación: la cuenta hasta que la borres; los pagos el tiempo que exija la normativa contable; los eventos de analítica mientras el servicio esté activo.",
        "Derechos: acceso, rectificación, supresión, oposición, limitación y portabilidad. Puedes borrar la cuenta en el panel si no tienes una campaña activa. Escribe al contacto del aviso legal.",
        "Puedes reclamar ante la Agencia Española de Protección de Datos.",
      ],
    },
    en: {
      title: "Privacy",
      body: [
        "TECHPODIO processes data to run the directory, accounts, and payments for sponsored positions.",
        "Controller: the identity published in the legal notice (LEGAL_ENTITY_NAME, LEGAL_TAX_ID, and LEGAL_ADDRESS). If they are empty, the site has not configured a controller yet.",
        "Account data: email, name, password hash, and role. Company data: whatever the company writes on its profile. Payment data: Stripe identifiers, amount, and status. We do not store card numbers.",
        "Leads and contact: the name, email, and message you send. Claims: the text and work email you provide.",
        "Product analytics run only if you accept the analytics cookie. We store the event name, path, and, if you are signed in, your id. Payments and claims are recorded even if you reject analytics because they are necessary for the contract.",
        "Legal bases: contract, legitimate interest in service security, and consent for analytics and advertising.",
        "Recipients: Stripe for charges. If RESEND_API_KEY is set, slot alerts are emailed through that provider. We do not sell files.",
        "Retention: the account until you delete it; payments for as long as accounting rules require; analytics events while the service is active.",
        "Rights: access, rectification, erasure, objection, restriction, and portability. You can delete the account in the dashboard if you have no active campaign. Write to the contact on the legal notice.",
        "You can complain to the Spanish Data Protection Agency.",
      ],
    },
  },
  terms: {
    es: {
      title: "Términos",
      body: [
        "TECHPODIO es un directorio. Una posición patrocinada es publicidad identificada, no un premio ni una afirmación de liderazgo de mercado.",
        "Los precios son los de la regla activa en el momento del checkout. No hay subastas ni desplazamiento por pagar más.",
        "El hueco es único para la combinación categoría + país + ciudad + posición. Si está ocupado, no se vende.",
        "La campaña empieza cuando Stripe confirma el pago y termina al acabar el periodo. Un cron, y también la visita al ranking, marcan como caducadas las que ya vencieron.",
        "Si el pago llega cuando el hueco ya no es tuyo ni está libre, no activamos la posición. Hay que gestionar el reembolso con el contacto del sitio.",
        "Eres responsable de que la ficha sea veraz. No publiques datos de terceros sin base para hacerlo.",
        "Podemos retirar una ficha o una campaña que incumpla la ley o estos términos.",
        "El servicio se ofrece tal cual está. La ley aplicable, mientras el aviso legal no diga otra cosa, es la española.",
      ],
    },
    en: {
      title: "Terms",
      body: [
        "TECHPODIO is a directory. A sponsored position is identified advertising, not an award or a claim of market leadership.",
        "Prices are those of the active rule at checkout. There are no auctions and no displacement by paying more.",
        "The slot is unique for category + country + city + position. If it is taken, it is not sold.",
        "The campaign starts when Stripe confirms payment and ends when the period ends. A cron job, and also opening the ranking, expires campaigns that are already due.",
        "If payment arrives when the slot is neither yours nor free, we do not activate the position. The refund has to be handled with the site contact.",
        "You are responsible for the profile being accurate. Do not publish other people’s data without a basis.",
        "We may remove a profile or campaign that breaks the law or these terms.",
        "The service is provided as it is. Unless the legal notice says otherwise, Spanish law applies.",
      ],
    },
  },
  cookies: {
    es: {
      title: "Cookies",
      body: [
        "Necesaria: tp_session, cookie httpOnly de sesión. Sin ella no hay cuenta.",
        "Preferencia: tp_consent recuerda si aceptas analítica. Dura unos seis meses.",
        "Analítica: si aceptas, el navegador envía eventos de página a /api/analytics. No cargamos un tercero de analítica.",
        "Publicidad: los componentes de anuncio están vacíos. No se inserta el script de AdSense hasta que exista un cliente y una implementación posterior. Aceptar la cookie no enciende anuncios por sí solo.",
        "Puedes quedar en “solo necesarias” desde el aviso.",
      ],
    },
    en: {
      title: "Cookies",
      body: [
        "Necessary: tp_session, an httpOnly session cookie. Without it there is no account.",
        "Preference: tp_consent remembers whether you accept analytics. It lasts about six months.",
        "Analytics: if you accept, the browser sends page events to /api/analytics. We do not load a third-party analytics vendor.",
        "Advertising: ad components are empty. The AdSense script is not injected until a client id and a later implementation exist. Accepting the cookie does not turn ads on by itself.",
        "You can stay on “necessary only” from the banner.",
      ],
    },
  },
  legal: {
    es: {
      title: "Aviso legal",
      body: [
        "Este sitio ofrece el directorio TECHPODIO.",
        "Titular, NIF y domicilio salen de LEGAL_ENTITY_NAME, LEGAL_TAX_ID y LEGAL_ADDRESS. Si no ves esos datos debajo, faltan en el entorno y hay que completarlos antes de usar el sitio en producción.",
        "Contacto: CONTACT_EMAIL o el formulario de /contacto.",
        "Los contenidos de terceros en las fichas los aporta quien crea o reclama la empresa.",
      ],
    },
    en: {
      title: "Legal notice",
      body: [
        "This site offers the TECHPODIO directory.",
        "The owner, tax id, and address come from LEGAL_ENTITY_NAME, LEGAL_TAX_ID, and LEGAL_ADDRESS. If you do not see them below, they are missing from the environment and must be set before production use.",
        "Contact: CONTACT_EMAIL or the form at /contacto.",
        "Third-party profile content is provided by whoever creates or claims the company.",
      ],
    },
  },
} as const;

export function LegalDocument({ locale, doc }: { locale: string; doc: keyof typeof docs }) {
  const copy = docs[doc][locale === "en" ? "en" : "es"];
  const identity = legalIdentity();
  return (
    <article className="wrap prose">
      <h1>{copy.title}</h1>
      {doc === "legal" ? (
        <p>
          {identity.name || t(locale, "Titular sin configurar", "Owner not configured")}
          {identity.taxId ? ` · ${identity.taxId}` : ""}
          {identity.address ? ` · ${identity.address}` : ""}
          {identity.email ? ` · ${identity.email}` : ""}
        </p>
      ) : null}
      {copy.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </article>
  );
}

export function legalTitle(locale: string, doc: keyof typeof docs) {
  return docs[doc][locale === "en" ? "en" : "es"].title;
}
