# Orbitvoice website

Marketing and download website for Orbitvoice. It includes Home, About, Docs, Contact and Privacy pages.

## Run locally

```powershell
cd website
copy .env.example .env.local
npm install
npm run dev
```

`npm run prepare-assets` copies the current installer from `desktop-app/` (or the local repository's `../release` folder) into `public/downloads/`. The website's download button calls `POST /api/download`, records the UTC timestamp and aggregates by day, month and year, then sends the browser to the installer. The stats file is local by default; use `DOWNLOAD_STATS_FILE` on a self-hosted Node server for a persistent location. Serverless hosts need a database or durable storage adapter for analytics persistence.

The Windows installer is about 129 MB. For Vercel, do not rely on a repository-local executable or the `release/` folder. Publish `Orbitvoice-1.1.0-Setup.exe` in the public GitHub Release tagged `v1.1.0`, or use another durable public location, then set `ORBITVOICE_INSTALLER_URL` in Vercel Environment Variables. The production fallback is `https://github.com/orbitdor-usman/orbitvoice/releases/download/v1.1.0/Orbitvoice-1.1.0-Setup.exe`.

The direct `/downloads/Orbitvoice-1.1.0-Setup.exe` path and the legacy root `/Orbitvoice-1.1.0-Setup.exe` path both redirect to the configured external installer URL when deployed without a local executable.

The header reads `GET /api/download-count`, which exposes only the public aggregate total and formats it compactly (`999`, `1k`, `1.1k`).

Protect `GET /api/analytics` with the server-only `DOWNLOAD_ANALYTICS_API_KEY` environment variable. Send it as `x-api-key` or `Authorization: Bearer ...`. Do not use a `NEXT_PUBLIC_` prefix for this key. The API adds security headers, limits repeated download events, and never stores raw IP addresses.

Deploy with `npm run build` and `npm start`. A public HTTPS deployment is recommended. The downloadable app is for Windows x64.

## Canonical domain and Google indexing

The product website is https://ov.orbitdor.com. Its canonical origin is centralized in `lib/site.js`; the company's separate website remains https://www.orbitdor.com. The old `NEXT_PUBLIC_SITE_URL` setting no longer overrides this product identity.

Page titles, descriptions, canonical URLs, Open Graph and Twitter metadata share the same configuration. `app/robots.js` serves `/robots.txt`, and `app/sitemap.js` serves `/sitemap.xml` with only the five public canonical pages. Update the sitemap's content date only after meaningful content changes. The generated `/opengraph-image` is a 1200 × 630 PNG using the existing logo. JSON-LD describes the actual app features and publisher without invented ratings or reviews.

The supplied Google verification token is included in the HTML head through Next.js metadata. In Google Search Console:

1. For an HTML-tag verification method on the URL-prefix property `https://ov.orbitdor.com/`, confirm the displayed HTML token matches the supplied token, then click Verify.
2. If the token was supplied for DNS verification, add the complete `google-site-verification=...` TXT value at the DNS host Google specifies. A Domain property cannot be verified by adding an HTML tag.
3. Submit `https://ov.orbitdor.com/sitemap.xml`.
4. Inspect the homepage and use Request indexing after the deployment is live.

Verification and indexing are completed in Google Search Console, not by a code deployment alone. Google does not use meta keywords for ranking; descriptive visible content, correct canonical URLs, crawlability and useful page titles are the focus here.
