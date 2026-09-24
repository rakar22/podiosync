export function AnalyticsCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <article className="card stat">
      <span className="tiny">{label}</span>
      <strong>{value}</strong>
      {hint ? <span className="tiny">{hint}</span> : null}
    </article>
  );
}
