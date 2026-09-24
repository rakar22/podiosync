import type { Metadata } from "next";
import { publicOrigin } from "./site";

export function meta(locale: string, title: string, description: string, path: string, index = true): Metadata {
  const base = publicOrigin();
  const canonical = `${base}/${locale}${path}`;
  return {
    title,
    description,
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    alternates: {
      canonical,
      languages: {
        es: `${base}/es${path}`,
        en: `${base}/en${path}`,
        "x-default": `${base}/es${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "TECHPODIO",
      locale: locale === "en" ? "en_GB" : "es_ES",
      type: "website",
    },
  };
}

export function absolute(path: string) {
  return `${publicOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
