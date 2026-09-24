export function LeadCard({ lead }: { lead: { name: string; email: string; message: string; createdAt: Date } }) {
  return (
    <article className="card">
      <strong>{lead.name}</strong>
      <div className="tiny">{lead.email} · {lead.createdAt.toISOString().slice(0, 10)}</div>
      <p>{lead.message}</p>
    </article>
  );
}
