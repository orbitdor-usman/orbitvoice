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

The Windows installer is about 129 MB. For Vercel, do not rely on a repository-local executable or the `release/` folder. Upload it to a durable public location such as a GitHub Release, object storage, or CDN and set `ORBITVOICE_INSTALLER_URL` in Vercel Environment Variables. If this variable is not set, the app falls back to `/downloads/Orbitvoice-1.1.0-Setup.exe` for local deployments.

The direct `/downloads/Orbitvoice-1.1.0-Setup.exe` path also redirects to the configured external installer URL when deployed without a local executable.

The header reads `GET /api/download-count`, which exposes only the public aggregate total and formats it compactly (`999`, `1k`, `1.1k`).

Protect `GET /api/analytics` with the server-only `DOWNLOAD_ANALYTICS_API_KEY` environment variable. Send it as `x-api-key` or `Authorization: Bearer ...`. Do not use a `NEXT_PUBLIC_` prefix for this key. The API adds security headers, limits repeated download events, and never stores raw IP addresses.

Deploy with `npm run build` and `npm start`. A public HTTPS deployment is recommended. The downloadable app is for Windows x64.
