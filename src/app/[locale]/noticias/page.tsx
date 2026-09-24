import { EmptyState } from "@/components/empty-state";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Noticias", "News"), t(locale, "Noticias con fuente. TECHPODIO no redacta hechos de empresas.", "Sourced news. TECHPODIO does not invent company facts."), "/noticias");
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const items = await prisma.newsItem.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { company: true } });
  return (
    <div className="wrap">
      <section className="hero">
        <h1>{t(locale, "Noticias", "News")}</h1>
        <p className="lede">{t(locale, "Cada pieza necesita un medio y una URL. No hay redactor automático ni notas inventadas. Un admin puede incorporar una fuente real desde el panel.", "Every item needs a publisher and a URL. There is no automatic writer and no invented notes. An admin can add a real source from the panel.")}</p>
      </section>
      {items.length === 0 ? <EmptyState title={t(locale, "Sin noticias", "No news")} body={t(locale, "El archivo está vacío a propósito.", "The archive is empty on purpose.")} /> : (
        <div className="grid-cards">
          {items.map((item) => (
            <article key={item.id} className="card">
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
              <p className="tiny"><a href={item.sourceUrl} rel="noopener noreferrer">{item.sourceName}</a>{item.company ? ` · ${item.company.name}` : ""}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
