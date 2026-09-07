import { NextResponse } from 'next/server';

const installerName = 'Orbitvoice-1.1.0-Setup.exe';
const publicInstallerUrl = 'https://github.com/orbitdor-usman/orbitvoice/releases/download/v1.1.0/Orbitvoice-1.1.0-Setup.exe';

export async function GET(request, { params }) {
  const { filename } = await params;
  if (filename !== installerName) {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }

  const configuredUrl = process.env.ORBITVOICE_INSTALLER_URL || publicInstallerUrl;
  if (configuredUrl === `/downloads/${installerName}` || configuredUrl === installerName) {
    return NextResponse.json({ error: 'Installer URL is not configured for this deployment.' }, { status: 503 });
  }

  try {
    const target = new URL(configuredUrl);
    if (!['https:', 'http:'].includes(target.protocol)) throw new Error('Unsupported installer URL protocol.');
    return NextResponse.redirect(target, 307);
  } catch {
    return NextResponse.json({ error: 'Installer URL is invalid.' }, { status: 503 });
  }
}
