// api/_db.ts
import { MongoClient } from 'mongodb';
const g = globalThis as any;

export async function getDb() {
  const uri =
    process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URL || '';
  const name =
    process.env.MONGODB_DB || process.env.MONGO_DB || process.env.MONGO_DATABASE || 'aasaasi_db';
  if (!uri || !name) throw new Error('Missing MONGO_URL or MONGO_DB');
  if (!g.__mongoClient) g.__mongoClient = new MongoClient(uri);
  if (!g.__mongoClient.topology?.isConnected?.()) await g.__mongoClient.connect();
  return g.__mongoClient.db(name);
}
