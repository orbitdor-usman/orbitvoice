import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const defaultFile = path.join(process.cwd(), 'data', 'download-stats.json');
const statsFile = process.env.DOWNLOAD_STATS_FILE || defaultFile;
const installer = '/downloads/Orbitvoice-1.1.0-Setup.exe';
let writeQueue = Promise.resolve();

function dayKey(date) { return date.toISOString().slice(0, 10); }
function monthKey(date) { return date.toISOString().slice(0, 7); }
function yearKey(date) { return date.getUTCFullYear().toString(); }
function blank() { return { total: 0, byDay: {}, byMonth: {}, byYear: {}, updatedAt: null }; }
async function readStats() {
  try { return { ...blank(), ...JSON.parse(await fs.readFile(statsFile, 'utf8')) }; }
  catch { return blank(); }
}
function clientHash(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return crypto.createHash('sha256').update(`${process.env.DOWNLOAD_ANALYTICS_API_KEY || 'orbitvoice'}:${forwarded}`).digest('hex').slice(0, 16);
}
export async function recordDownload(request) {
  const date = new Date();
  const event = { downloadedAt: date.toISOString(), day: dayKey(date), month: monthKey(date), year: yearKey(date), client: clientHash(request) };
  writeQueue = writeQueue.then(async () => {
    const stats = await readStats();
    stats.total += 1;
    stats.byDay[event.day] = (stats.byDay[event.day] || 0) + 1;
    stats.byMonth[event.month] = (stats.byMonth[event.month] || 0) + 1;
    stats.byYear[event.year] = (stats.byYear[event.year] || 0) + 1;
    stats.updatedAt = event.downloadedAt;
    await fs.mkdir(path.dirname(statsFile), { recursive: true });
    await fs.writeFile(statsFile, JSON.stringify(stats, null, 2), 'utf8');
  }).catch(error => console.error('Download analytics write failed:', error.message));
  await writeQueue;
  return event;
}
export async function getDownloadStats() { return readStats(); }
export { installer };
