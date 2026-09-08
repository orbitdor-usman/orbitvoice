import { NextResponse } from 'next/server';
import { checkDownloadRateLimit, installer, recordDownload } from '../../../lib/downloads';

export async function POST(request) {
  const rateLimit = await checkDownloadRateLimit(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many download requests. Try again in a minute.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(rateLimit.retryAfter),
        },
      },
    );
  }
  const event = await recordDownload(request);
  return NextResponse.json(
    { url: installer, trackedAt: event.downloadedAt },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export function GET() { return NextResponse.json({ error: 'Use POST.' }, { status: 405, headers: { Allow: 'POST' } }); }
