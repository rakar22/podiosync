import Link from "next/link";

export function EmptyState({
  title,
  body,
  actions = [],
}: {
  title: string;
  body: string;
  actions?: { href: string; label: string }[];
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p className="muted">{body}</p>
      {actions.length ? (
        <div className="empty-actions">
          {actions.map((action) => (
            <Link key={action.href + action.label} className="btn btn-small" href={action.href}>{action.label}</Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
