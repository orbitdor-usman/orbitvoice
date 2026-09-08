import release from './release.json';

export function getInstallerUrl() {
  const configured = process.env.ORBITVOICE_INSTALLER_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (['https:', 'http:'].includes(url.protocol)) return url.href;
    } catch {}
  }
  return release.githubDownloadUrl;
}
