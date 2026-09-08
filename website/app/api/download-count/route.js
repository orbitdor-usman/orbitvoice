import { NextResponse } from 'next/server';
import { checkDownloadRateLimit, getDownloadCount } from '../../../lib/downloads';

export async function GET(request) {
  const rateLimit = await checkDownloadRateLimit(request, { limit: 60, scope: 'count' });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many count requests. Try again shortly.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(rateLimit.retryAfter),
        },
      },
    );
  }

  return NextResponse.json(
    { total: await getDownloadCount() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
