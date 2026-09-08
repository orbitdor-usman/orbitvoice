import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getMongoDatabase } from "./mongodb";

const defaultFile = path.join(process.cwd(), "data", "download-stats.json");
const statsFile = process.env.DOWNLOAD_STATS_FILE || defaultFile;
const publicInstallerUrl =
  "https://github.com/orbitdor-usman/orbitvoice/releases/download/v1.1.0/Orbitvoice-1.1.0-Setup.exe";
const configuredInstallerUrl = process.env.ORBITVOICE_INSTALLER_URL;
const installer =
  configuredInstallerUrl && /^https?:\/\//i.test(configuredInstallerUrl)
    ? configuredInstallerUrl
    : publicInstallerUrl;
const downloadCollection = "download_events";
const rateLimitCollection = "download_rate_limits";
const rateLimitWindowMs = 60_000;
const fallbackWindows = new Map();
let writeQueue = Promise.resolve();
let mongoIndexesPromise;

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function yearKey(date) {
  return date.getUTCFullYear().toString();
}

function blank() {
  return { total: 0, byDay: {}, byMonth: {}, byYear: {}, updatedAt: null };
}

async function readStats() {
  try {
    return { ...blank(), ...JSON.parse(await fs.readFile(statsFile, "utf8")) };
  } catch {
    return blank();
  }
}

function getClientIp(request) {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function hashClientIp(ip) {
  const secret =
    process.env.DOWNLOAD_IP_HASH_SECRET ||
    process.env.DOWNLOAD_ANALYTICS_API_KEY ||
    "orbitvoice-local-development-secret";
  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}

function requestIdentity(request) {
  return { ipHash: hashClientIp(getClientIp(request)) };
}

function safeHeader(request, name) {
  return (request.headers.get(name) || "").slice(0, 512);
}

async function ensureMongoIndexes(db) {
  if (!mongoIndexesPromise) {
    mongoIndexesPromise = Promise.all([
      db.collection(downloadCollection).createIndexes([
        { key: { downloadedAt: -1 }, name: "downloaded_at" },
        { key: { day: 1 }, name: "download_day" },
        { key: { ipHash: 1, downloadedAt: -1 }, name: "download_ip_time" },
      ]),
      db.collection(rateLimitCollection).createIndex(
        { expiresAt: 1 },
        { name: "rate_limit_expiry", expireAfterSeconds: 0 },
      ),
    ]).catch((error) => {
      mongoIndexesPromise = undefined;
      throw error;
    });
  }
  await mongoIndexesPromise;
}

function mongoResultDocument(result) {
  return result && "value" in result ? result.value : result;
}

export async function checkDownloadRateLimit(
  request,
  { limit = 12, scope = "download" } = {},
) {
  const { ipHash } = requestIdentity(request);
  const now = Date.now();
  const windowStart = Math.floor(now / rateLimitWindowMs) * rateLimitWindowMs;
  const windowId = `${scope}:${ipHash}:${windowStart}`;
  const retryAfter = Math.max(
    1,
    Math.ceil((windowStart + rateLimitWindowMs - now) / 1000),
  );
  const db = await getMongoDatabase();

  if (!db) {
    const recent = (fallbackWindows.get(windowId) || 0) + 1;
    fallbackWindows.set(windowId, recent);
    return { allowed: recent <= limit, retryAfter };
  }

  await ensureMongoIndexes(db);
  const result = await db.collection(rateLimitCollection).findOneAndUpdate(
    { _id: windowId },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        createdAt: new Date(now),
        expiresAt: new Date(windowStart + rateLimitWindowMs + 5_000),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  const document = mongoResultDocument(result);
  const count = Number(document?.count || 0);
  return { allowed: count <= limit, retryAfter };
}

function makeEvent(request) {
  const date = new Date();
  const { ipHash } = requestIdentity(request);
  return {
    _id: crypto.randomUUID(),
    downloadedAt: date,
    day: dayKey(date),
    month: monthKey(date),
    year: yearKey(date),
    ipHash,
    userAgent: safeHeader(request, "user-agent"),
    referer: safeHeader(request, "referer"),
  };
}

export async function recordDownload(request) {
  const event = makeEvent(request);
  const db = await getMongoDatabase();

  if (db) {
    await ensureMongoIndexes(db);
    await db.collection(downloadCollection).insertOne(event);
    return { ...event, downloadedAt: event.downloadedAt.toISOString() };
  }

  const fallbackEvent = {
    downloadedAt: event.downloadedAt.toISOString(),
    day: event.day,
    month: event.month,
    year: event.year,
    client: event.ipHash.slice(0, 16),
  };
  writeQueue = writeQueue
    .then(async () => {
      const stats = await readStats();
      stats.total += 1;
      stats.byDay[event.day] = (stats.byDay[event.day] || 0) + 1;
      stats.byMonth[event.month] = (stats.byMonth[event.month] || 0) + 1;
      stats.byYear[event.year] = (stats.byYear[event.year] || 0) + 1;
      stats.updatedAt = fallbackEvent.downloadedAt;
      await fs.mkdir(path.dirname(statsFile), { recursive: true });
      await fs.writeFile(statsFile, JSON.stringify(stats, null, 2), "utf8");
    })
    .catch((error) => console.error("Download analytics write failed:", error.message));
  await writeQueue;
  return fallbackEvent;
}

export async function getDownloadCount() {
  const db = await getMongoDatabase();
  if (db) return db.collection(downloadCollection).countDocuments();
  const stats = await readStats();
  return stats.total || 0;
}

export async function getDownloadStats() {
  const db = await getMongoDatabase();
  if (!db) return readStats();

  await ensureMongoIndexes(db);
  const rows = await db.collection(downloadCollection).aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        updatedAt: { $max: "$downloadedAt" },
        byDay: { $push: "$day" },
        byMonth: { $push: "$month" },
        byYear: { $push: "$year" },
      },
    },
  ]).toArray();
  const row = rows[0];
  if (!row) return blank();

  const countValues = (values) => values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
  return {
    total: row.total || 0,
    byDay: countValues(row.byDay || []),
    byMonth: countValues(row.byMonth || []),
    byYear: countValues(row.byYear || []),
    updatedAt: row.updatedAt?.toISOString?.() || null,
  };
}

export { installer };
