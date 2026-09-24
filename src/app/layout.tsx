import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { publicOrigin } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicOrigin()),
  title: { default: "TECHPODIO", template: "%s · TECHPODIO" },
  description: "Descubre las empresas que están construyendo la tecnología de Europa.",
  icons: { icon: "/favicon.svg" },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const locale = headerStore.get("x-locale") === "en" ? "en" : "es";
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
