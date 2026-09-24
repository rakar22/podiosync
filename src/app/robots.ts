import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/health", "/webhook/", "/*/dashboard", "/*/admin", "/*/login", "/*/register", "/*/comprar", "/*/checkout/", "/*/reclamar/"],
    },
    sitemap: `${publicOrigin()}/sitemap.xml`,
  };
}
