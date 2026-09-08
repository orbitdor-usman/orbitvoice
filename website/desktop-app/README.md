# Desktop installer

Place the current `Orbitvoice-1.2.1-Setup.exe` in this folder for local website development. `npm run prepare-assets` copies it to `public/downloads/` when present.

The executable is intentionally ignored by Git because the current installer is about 156 MB. Production downloads use the GitHub Release asset configured in `lib/release.json`. A file in this local folder is not automatically published to GitHub or Vercel; upload new installers as Release assets before updating the website's version.
