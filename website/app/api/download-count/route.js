import { NextResponse } from 'next/server';
import { getDownloadStats } from '../../../lib/downloads';

export async function GET() {
  const stats = await getDownloadStats();
  return NextResponse.json({ total: stats.total || 0 }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
