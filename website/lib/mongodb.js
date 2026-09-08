import { MongoClient } from "mongodb";

const globalForMongo = globalThis;

export async function getMongoDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (!globalForMongo.__orbitvoiceMongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    globalForMongo.__orbitvoiceMongoClientPromise = client.connect();
  }

  const client = await globalForMongo.__orbitvoiceMongoClientPromise;
  return client.db(process.env.MONGODB_DB_NAME || "orbitvoice");
}
