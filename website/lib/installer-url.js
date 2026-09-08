import release from './release.json';

// Migrate previously supplied defaults still saved in deployment environments.
// Explicit custom CDN URLs continue to work as overrides.
const obsoleteUrls = new Set([
  `https://github.com/orbitdor-usman/orbitvoice/raw/refs/heads/main/website/public/downloads/${release.fileName}`,
  `https://raw.githubusercontent.com/orbitdor-usman/orbitvoice/main/website/public/downloads/${release.fileName}`,
  'https://github.com/orbitdor-usman/orbitvoice/releases/download/v1.1.0/Orbitvoice-1.1.0-Setup.exe',
]);

export function getInstallerUrl() {
  const configured = process.env.ORBITVOICE_INSTALLER_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (['https:', 'http:'].includes(url.protocol) && !obsoleteUrls.has(url.href)) return url.href;
    } catch {}
  }
  return release.githubDownloadUrl;
}
