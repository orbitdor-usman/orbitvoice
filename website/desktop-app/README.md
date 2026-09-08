# Desktop installer

Place the current `Orbitvoice-1.2.1-Setup.exe` in this folder for local website development. `npm run prepare-assets` copies it to `public/downloads/` when present.

The executable is intentionally ignored by Git because the current installer is about 156 MB. Hosting it at `website/public/downloads` on GitHub requires Git LFS. A GitHub Release asset or CDN can also host it; set `ORBITVOICE_INSTALLER_URL` to the chosen direct download URL. A file in this local folder is not automatically published to GitHub or Vercel.
