import { EmptyState } from "@/components/empty-state";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/locale";
import { meta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return meta(locale, t(locale, "Señales", "Signals"), t(locale, "Señales de producto, contratación o regulación con fuente.", "Product, hiring, or regulation signals with a source."), "/senales");
}

export default async function SignalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const items = await prisma.signal.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { company: true } });
  return (
    <div className="wrap">
      <section className="hero">
        <h1>{t(locale, "Señales", "Signals")}</h1>
        <p className="lede">{t(locale, "Una señal es un hecho con fuente: producto, contratación, regulación, acuerdo o código abierto. No inferimos rondas ni plantillas.", "A signal is a sourced fact: product, hiring, regulation, partnership, or open source. We do not infer rounds or headcount.")}</p>
      </section>
      {items.length === 0 ? <EmptyState title={t(locale, "Sin señales", "No signals")} body={t(locale, "Cuando haya una fuente verificable, aparecerá aquí.", "When there is a verifiable source, it will show up here.")} /> : (
        <div className="grid-cards">
          {items.map((item) => (
            <article key={item.id} className="card">
              <p className="kicker">{item.kind}</p>
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
              <p className="tiny"><a href={item.sourceUrl} rel="noopener noreferrer">{item.sourceName}</a></p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
