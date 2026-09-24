export function AdSlot({ slot, format = "banner" }: { slot: string; format?: "banner" | "infeed" | "sidebar" }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return <div className="ad-slot-idle" data-ad-slot={slot} data-ad-format={format} hidden />;
  return <aside className={`ad-slot ad-slot-${format}`} data-ad-client={client} data-ad-slot={slot} data-ad-format={format} aria-label="Publicidad" />;
}
