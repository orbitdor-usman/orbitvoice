import { siteUrl } from "../lib/site";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/data/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
