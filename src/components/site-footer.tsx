import Link from "next/link";
import { ui } from "@/lib/i18n";
import { legalIdentity } from "@/lib/site";

export function SiteFooter({ locale }: { locale: string }) {
  const labels = ui(locale);
  const legal = legalIdentity();
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <strong>TECHPODIO</strong>
          <p className="tiny">{labels.claimLine}</p>
          <p className="tiny">{legal.name || (locale === "en" ? "Legal entity not configured." : "Identidad legal sin configurar.")} {legal.email}</p>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <Link href={`/${locale}/privacidad`}>{labels.privacy}</Link>
          <Link href={`/${locale}/terminos`}>{labels.terms}</Link>
          <Link href={`/${locale}/cookies`}>{labels.cookies}</Link>
          <Link href={`/${locale}/aviso-legal`}>{labels.legal}</Link>
          <Link href={`/${locale}/contacto`}>{labels.contact}</Link>
          <Link href={`/${locale}/noticias`}>{labels.news}</Link>
          <Link href={`/${locale}/senales`}>{labels.signals}</Link>
          <Link href={`/${locale}/comparar`}>{labels.compare}</Link>
        </div>
      </div>
    </footer>
  );
}
