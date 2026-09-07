# Desktop installer

Place the current `Orbitvoice-1.1.0-Setup.exe` in this folder for local website development. `npm run prepare-assets` copies it to `public/downloads/` when present.

The executable is intentionally ignored by Git because the current installer is about 129 MB. For Vercel production, upload it to a durable public release or CDN and set `ORBITVOICE_INSTALLER_URL` to that URL.
