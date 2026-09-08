# Orbitvoice website

Marketing and download website for Orbitvoice. It includes Home, About, Docs, Contact and Privacy pages.

## Run locally

```powershell
cd website
copy .env.example .env.local
npm install
npm run dev
```

`npm run prepare-assets` copies the current installer from `desktop-app/` (or the local repository's `../release` folder) into `public/downloads/`. The website's download button calls `POST /api/download`, stores one MongoDB `download_events` document per accepted click, and then sends the browser to the installer. Each document includes the UTC day, month, year, a one-way HMAC IP hash, and limited request context; raw IP addresses are never stored. If `MONGODB_URI` is not configured for local development, the existing JSON file fallback is used.

The current version, filename, size and GitHub download URL are defined together in `lib/release.json`. The header badge, download API, public redirect, docs filename, homepage release details and software metadata share that configuration. The current installer is about 156 MB.

The configured GitHub repository-file URL is `https://github.com/orbitdor-usman/orbitvoice/raw/refs/heads/main/website/public/downloads/Orbitvoice-1.2.1-Setup.exe`. `raw/refs/heads/main` requests the file contents; a regular GitHub folder or `blob` URL is a webpage. The actual repository folder is `website/public/downloads` (plural), while its public website URL starts with `/downloads/`.

At verification time, GitHub has no installer at this repository path and has only the older `v1.1.0` Release. The new raw URL will return 404 until the file is published. GitHub blocks ordinary Git files larger than 100 MiB; this executable needs Git LFS to be stored at the requested repository path. Alternatively, publish it as a GitHub Release asset and set `ORBITVOICE_INSTALLER_URL` to that asset's download URL. See [GitHub large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

Set or update `ORBITVOICE_INSTALLER_URL` in Vercel to match the chosen hosted file, then redeploy. An existing Vercel value overrides the default in the code; editing `.env` locally does not update Vercel. The local executable is ignored by Git and is not automatically uploaded by this configuration change.

The public `/downloads/Orbitvoice-1.2.1-Setup.exe` path and the legacy root `/Orbitvoice-1.1.0-Setup.exe` path both redirect to the current GitHub installer URL when deployed without a local executable.

The header reads `GET /api/download-count`, which counts the MongoDB event documents and exposes only the public aggregate total, formatted compactly (`999`, `1k`, `1.1k`). Both public endpoints use a MongoDB-backed fixed-window rate limiter when MongoDB is configured.

Protect `GET /api/analytics` with the server-only `DOWNLOAD_ANALYTICS_API_KEY` environment variable. Send it as `x-api-key` or `Authorization: Bearer ...`. Do not use a `NEXT_PUBLIC_` prefix for this key. Configure `MONGODB_URI`, `MONGODB_DB_NAME`, and a separate random `DOWNLOAD_IP_HASH_SECRET` in Vercel. The API adds security headers, limits repeated download events, and never stores raw IP addresses.

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
