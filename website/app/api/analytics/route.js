import { NextResponse } from 'next/server';
import { getDownloadStats } from '../../../lib/downloads';
export async function GET() {
  const stats = await getDownloadStats();
  return NextResponse.json(stats, { headers: { 'Cache-Control': 'no-store' } });
}
