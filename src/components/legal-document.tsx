import { t } from "@/lib/i18n";
import { legalIdentity, siteName } from "@/lib/site";

function paragraphs(locale: string, doc: "privacy" | "terms" | "cookies" | "legal") {
  const name = siteName();
  const legal = legalIdentity();
  const law = legal.jurisdiction || (locale === "en" ? "the law stated once the legal notice is configured" : "la ley que indique el aviso legal cuando esté configurado");
  const es = locale !== "en";
  if (doc === "privacy") {
    return es
      ? [
          `${name} trata datos para el directorio, las cuentas, las reclamaciones de ficha y el cobro de posiciones patrocinadas a precio fijo.`,
          "Roles. El responsable del tratamiento es la entidad del aviso legal (LEGAL_ENTITY_NAME, LEGAL_TAX_ID, LEGAL_ADDRESS). Si esos datos aparecen como pendientes, el responsable todavía no está publicado y no debe darse el sitio por cerrado en producción. Stripe actúa como encargado del cobro: recibe el importe, la moneda y los identificadores de la sesión. No guardamos el número de tarjeta. Si RESEND_API_KEY está configurado, Resend envía los avisos de la bandeja; si no lo está, el aviso queda en cola y no se simula el envío.",
          "Datos. Cuenta: email, nombre, hash de contraseña y rol. Empresa: lo que quien crea o reclama la ficha escribe (nombre, web, descripción, sede, tecnologías, productos, servicios, contacto público y, si lo declara, rango de plantilla). Reclamación: email de trabajo y texto de prueba. Pago: identificadores de Stripe, importe, moneda y estado. Contacto y leads: nombre, email y mensaje. Lista de espera: email y el hueco pedido. Analítica: tipo de evento, ruta y, si hay sesión y consentimiento, el identificador de usuario.",
          "Bases. Ejecución del contrato para cuenta, ficha, reclamación y pago. Interés legítimo en seguridad, prevención de abuso y registro de auditoría de precios. Consentimiento para analítica y para publicidad no esencial.",
          "Conservación. La cuenta, hasta que la borres (no se borra si hay una campaña activa). La ficha de empresa, mientras esté publicada o exista una obligación de conservar el historial de una campaña. Pagos y facturación, el plazo que exija la normativa contable del responsable una vez esté identificado. Reclamaciones, hasta que se resuelvan y un año después, salvo disputa. Mensajes de contacto y leads, 24 meses. Lista de espera, hasta que el hueco se libere y se intente el aviso, o 12 meses. Eventos de analítica, 14 meses. Cookies de preferencia, 180 días.",
          "Empresas. Quien publica una ficha puede corregirla desde el panel. Quien representa a una empresa ya publicada puede reclamarla; un administrador aprueba, rechaza o verifica. Para suprimir una ficha o pedir una corrección que el panel no cubre, escribe al email de contacto indicando el nombre de la empresa y el cambio. La baja de cuenta anonimiza el email si no hay campaña activa. No inventamos empresas, financiación, plantilla ni reseñas.",
          "Derechos. Acceso, rectificación, supresión, oposición, limitación y portabilidad, ante el email de contacto. Si el responsable ya está configurado en España, también puedes reclamar ante la Agencia Española de Protección de Datos. Si la jurisdicción configurada es otra, el aviso legal indica la autoridad.",
          "Destinatarios. Stripe (procesador de pagos) y, solo con claves, Resend. No vendemos ficheros ni cedemos el directorio a redes publicitarias salvo el script de AdSense, y solo si aceptas publicidad y existe un cliente de anuncios.",
        ]
      : [
          `${name} processes data to run the directory, accounts, profile claims, and payment for fixed-price sponsored positions.`,
          "Roles. The controller is the entity in the legal notice (LEGAL_ENTITY_NAME, LEGAL_TAX_ID, LEGAL_ADDRESS). If those fields show as pending, a controller has not been published yet and the site should not be treated as closed for production. Stripe is the payment processor: it receives the amount, currency, and session identifiers. We do not store card numbers. If RESEND_API_KEY is set, Resend sends outbox notices; if it is not, the notice stays queued and sending is not simulated.",
          "Data. Account: email, name, password hash, and role. Company: what the person who creates or claims the profile writes (name, website, description, location, technologies, products, services, public contact, and a headcount range only if they declare one). Claim: work email and evidence. Payment: Stripe identifiers, amount, currency, and status. Contact and leads: name, email, and message. Waitlist: email and the requested slot. Analytics: event name, path, and, with a session and consent, the user id.",
          "Bases. Contract for the account, profile, claim, and payment. Legitimate interest in security, abuse prevention, and the pricing audit log. Consent for analytics and non-essential advertising.",
          "Retention. The account until you delete it (deletion is blocked while a campaign is active). The company profile while it is published or a campaign history must be kept. Payments, for the accounting period required once the controller is identified. Claims, until resolved and for one year after, unless there is a dispute. Contact messages and leads, 24 months. Waitlist, until the slot frees and a notice is attempted, or 12 months. Analytics events, 14 months. Preference cookies, 180 days.",
          "Companies. Whoever publishes a profile can correct it from the dashboard. Whoever represents a published company can claim it; an admin approves, rejects, or verifies. To erase a profile or request a correction the dashboard does not cover, write to the contact email with the company name and the change. Account deletion anonymises the email when there is no active campaign. We do not invent companies, funding, headcount, or reviews.",
          "Rights. Access, rectification, erasure, objection, restriction, and portability, via the contact email. Once a Spanish controller is configured, you can also complain to the Spanish Data Protection Agency. If another jurisdiction is configured, the legal notice names the authority.",
          "Recipients. Stripe (payment processor) and, only when keys exist, Resend. We do not sell files. Advertising scripts load only if you accept ads and an ad client is configured.",
        ];
  }
  if (doc === "terms") {
    return es
      ? [
          `${name} es un directorio B2B. Una posición patrocinada es publicidad identificada, no un premio ni una afirmación de liderazgo.`,
          "Precio fijo. El importe es el de la regla activa en el checkout (posición, duración y, si existe, categoría, país y ciudad). No hay subastas ni pujas. Pagar más no desplaza a quien ocupa el hueco.",
          "Unicidad. El hueco es categoría + país + ciudad (o país entero) + posición. Si está ocupado o reservado, la compra no se activa encima de otra empresa. Una reserva de pago caduca a los 45 minutos si Stripe no confirma.",
          "Activación. La campaña empieza cuando Stripe confirma el pago (webhook o página de vuelta, de forma idempotente) y termina al acabar el periodo. El cron y la visita al ranking marcan como caducadas las campañas vencidas y liberan el hueco.",
          "Renovación. Si el hueco sigue siendo de tu empresa, renovar alarga la fecha de fin desde el máximo entre hoy y el fin actual. Si ya lo tiene otra empresa, no se lo quitamos.",
          "Conflicto de pago. Si el cobro llega cuando el hueco ya no es tuyo ni está libre, el pago queda registrado y la campaña no se activa. El reembolso se gestiona con el contacto del sitio; no es automático.",
          "Ficha. Eres responsable de que los datos sean veraces. Puedes corregirlos en el panel y pedir la supresión por el contacto. No publiques datos de terceros sin base.",
          `Ley. ${law}. Podemos retirar una ficha o una campaña que incumpla la ley o estos términos.`,
        ]
      : [
          `${name} is a B2B directory. A sponsored position is identified advertising, not an award or a claim of leadership.`,
          "Fixed price. The amount is the active rule at checkout (position, duration, and category, country, and city when set). There are no auctions or bids. Paying more does not displace the current holder.",
          "Uniqueness. The slot is category + country + city (or the whole country) + position. If it is taken or held, the purchase is not activated on top of another company. A payment hold expires after 45 minutes if Stripe does not confirm.",
          "Activation. The campaign starts when Stripe confirms payment (webhook or return page, idempotently) and ends when the period ends. The cron job and opening the ranking expire due campaigns and free the slot.",
          "Renewal. If your company still holds the slot, renewal extends the end date from the later of today and the current end. If another company holds it, we do not take it away.",
          "Payment conflict. If the charge arrives when the slot is neither yours nor free, the payment is recorded and the campaign is not activated. The refund is handled with the site contact; it is not automatic.",
          "Profile. You are responsible for the facts being accurate. You can correct them in the dashboard and request erasure via the contact address. Do not publish other people’s data without a basis.",
          `Law. ${law}. We may remove a profile or campaign that breaks the law or these terms.`,
        ];
  }
  if (doc === "cookies") {
    return es
      ? [
          "Necesarias. tp_session es la cookie httpOnly de sesión. Sin ella no hay cuenta ni panel. No requiere consentimiento.",
          "Preferencias. tp_consent guarda tu elección durante 180 días. Valores: solo necesarias, analítica, publicidad, o ambas. Puedes cambiarla borrando la cookie o volviendo a elegir en este sitio.",
          "Analítica. Si la aceptas, el navegador envía eventos de página a /api/analytics (nombre, ruta, idioma). No cargamos un tercero de analítica. Si la rechazas, ese envío no se hace. Los cobros, reclamaciones y la auditoría de precios se registran igual porque son necesarios para el contrato.",
          "Publicidad. Si existe NEXT_PUBLIC_ADSENSE_CLIENT y aceptas la categoría de publicidad, se carga el script de Google AdSense. Si rechazas las no esenciales, o si no marcas publicidad en Preferencias, el script no se inserta. Sin cliente de anuncios, los espacios quedan vacíos aunque aceptes.",
          "Terceros de pago. Stripe puede usar cookies en su propio dominio durante el checkout. Esa visita sale de este sitio hacia Stripe.",
        ]
      : [
          "Necessary. tp_session is the httpOnly session cookie. Without it there is no account or dashboard. It does not need consent.",
          "Preferences. tp_consent stores your choice for 180 days. Values: necessary only, analytics, advertising, or both. Clear the cookie or choose again to change it.",
          "Analytics. If you accept them, the browser sends page events to /api/analytics (name, path, language). We do not load a third-party analytics vendor. If you reject them, that send does not happen. Payments, claims, and the pricing audit log are still recorded because they are necessary for the contract.",
          "Advertising. If NEXT_PUBLIC_ADSENSE_CLIENT exists and you accept advertising, the Google AdSense script loads. If you reject non-essential cookies, or you leave advertising off in Preferences, the script is not injected. Without an ad client, slots stay empty even if you accept.",
          "Payment third parties. Stripe may use cookies on its own domain during checkout. That visit leaves this site for Stripe.",
        ];
  }
  return es
    ? [
        `Este sitio ofrece el directorio ${name}.`,
        "El titular, el identificador fiscal, el domicilio y la jurisdicción salen solo de LEGAL_ENTITY_NAME, LEGAL_TAX_ID, LEGAL_ADDRESS y LEGAL_JURISDICTION. Si faltan, el aviso lo dice como pendiente de configuración. No se publica un nombre de sociedad ni un CIF de relleno.",
        "Contacto: LEGAL_EMAIL, o CONTACT_EMAIL, o el formulario de contacto. El correo de contacto por defecto del proyecto, mientras no definas otro, es el buzón indicado abajo.",
        "Los textos de las fichas los aporta quien crea o reclama la empresa. Las posiciones patrocinadas son publicidad a precio fijo.",
        legal.jurisdiction
          ? `Jurisdicción configurada: ${legal.jurisdiction}.`
          : "Jurisdicción: pendiente de configuración. Hasta entonces no afirmamos un foro concreto.",
      ]
    : [
        `This site offers the ${name} directory.`,
        "The owner, tax identifier, address, and jurisdiction come only from LEGAL_ENTITY_NAME, LEGAL_TAX_ID, LEGAL_ADDRESS, and LEGAL_JURISDICTION. If they are missing, the notice says they are pending configuration. No filler company name or tax id is published.",
        "Contact: LEGAL_EMAIL, or CONTACT_EMAIL, or the contact form. Until you set another address, the project’s default contact mailbox is the one shown below.",
        "Profile copy is provided by whoever creates or claims the company. Sponsored positions are fixed-price advertising.",
        legal.jurisdiction
          ? `Configured jurisdiction: ${legal.jurisdiction}.`
          : "Jurisdiction: pending configuration. Until then we do not assert a specific forum.",
      ];
}

export function LegalDocument({ locale, doc }: { locale: string; doc: "privacy" | "terms" | "cookies" | "legal" }) {
  const titles = {
    privacy: t(locale, "Privacidad", "Privacy"),
    terms: t(locale, "Términos", "Terms"),
    cookies: t(locale, "Cookies", "Cookies"),
    legal: t(locale, "Aviso legal", "Legal notice"),
  };
  const identity = legalIdentity();
  return (
    <article className="wrap prose">
      <h1>{titles[doc]}</h1>
      {!identity.configured ? (
        <p className="notice">
          {t(
            locale,
            "Identidad legal pendiente de configuración. Faltan el nombre de la entidad, el identificador fiscal o el domicilio. No se muestra un titular inventado.",
            "Legal identity is pending configuration. The entity name, tax identifier, or address is missing. No invented owner is shown.",
          )}
        </p>
      ) : (
        <p>
          {identity.name}
          {identity.taxId ? ` · ${identity.taxId}` : ""}
          {identity.address ? ` · ${identity.address}` : ""}
          {identity.jurisdiction ? ` · ${identity.jurisdiction}` : ""}
        </p>
      )}
      <p>{identity.email}</p>
      {paragraphs(locale, doc).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </article>
  );
}

export function legalTitle(locale: string, doc: "privacy" | "terms" | "cookies" | "legal") {
  return {
    privacy: t(locale, "Privacidad", "Privacy"),
    terms: t(locale, "Términos", "Terms"),
    cookies: t(locale, "Cookies", "Cookies"),
    legal: t(locale, "Aviso legal", "Legal notice"),
  }[doc];
}
