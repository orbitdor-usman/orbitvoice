// The product's canonical origin. Orbitdor's company site is a separate website.
export const siteUrl = "https://ov.orbitdor.com";
export const companyUrl = "https://www.orbitdor.com";
export const googleVerification = "d5LuSOHtC4G04YwHio3GUDHuM_Zj_FJ3qyGYtAZlC2Y";
export const socialImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Orbitvoice — voice typing and speech to text for Windows",
};
export const publicPages = ["/", "/about", "/docs", "/contact", "/privacy"];

export function pageMetadata({ title, description, path, keywords = [] }) {
  const url = new URL(path, siteUrl).href;
  const fullTitle = path === "/" ? title : `${title} — Orbitvoice`;
  return {
    title: { absolute: fullTitle },
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Orbitvoice",
      url,
      title: fullTitle,
      description,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [socialImage],
    },
  };
}
