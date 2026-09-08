import { NextResponse } from 'next/server';
import release from '../../../lib/release.json';
import { getInstallerUrl } from '../../../lib/installer-url';

const installerNames = new Set([
  release.fileName,
  // Keep previously shared website links working after the release change.
  'Orbitvoice-1.1.0-Setup.exe',
]);

export async function GET(request, { params }) {
  const { filename } = await params;
  if (!installerNames.has(filename)) {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }

  const targetUrl = getInstallerUrl();

  try {
    const target = new URL(targetUrl);
    if (!['https:', 'http:'].includes(target.protocol)) throw new Error('Unsupported installer URL protocol.');
    return NextResponse.redirect(target, { status: 307, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Installer URL is invalid.' }, { status: 503 });
  }
}
