import { siteUrl, publicPages } from "../lib/site";

// Update this only when the public page content materially changes.
const contentUpdated = "2026-09-08";
export default function sitemap() {
  return publicPages.map((path) => ({
    url: new URL(path, siteUrl).href,
    lastModified: contentUpdated,
  }));
}
