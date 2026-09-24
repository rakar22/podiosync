import Link from "next/link";
import { JsonLd } from "./json-ld";
import { absolute } from "@/lib/seo";

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`}>
            {index > 0 ? " / " : null}
            {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}
          </span>
        ))}
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            ...(item.href ? { item: absolute(item.href) } : {}),
          })),
        }}
      />
    </>
  );
}
