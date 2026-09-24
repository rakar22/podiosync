import type { Metadata } from "next";
import { publicOrigin, siteName } from "./site";

export function meta(locale: string, title: string, description: string, path: string, index = true): Metadata {
  const base = publicOrigin();
  const canonical = `${base}/${locale}${path}`;
  const name = siteName();
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
      siteName: name,
      locale: locale === "en" ? "en_GB" : "es_ES",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function absolute(path: string) {
  return `${publicOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
