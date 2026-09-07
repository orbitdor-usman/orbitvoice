import { NextResponse } from 'next/server';
import { installer, recordDownload } from '../../../lib/downloads';

const attempts = new Map();
export async function POST(request) {
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(time => now - time < 60_000);
  if (recent.length >= 20) return NextResponse.json({ error: 'Too many download requests. Try again in a minute.' }, { status: 429 });
  attempts.set(key, [...recent, now]);
  const event = await recordDownload(request);
  return NextResponse.json({ url: installer, trackedAt: event.downloadedAt }, { headers: { 'Cache-Control': 'no-store' } });
}
export function GET() { return NextResponse.json({ error: 'Use POST.' }, { status: 405, headers: { Allow: 'POST' } }); }
