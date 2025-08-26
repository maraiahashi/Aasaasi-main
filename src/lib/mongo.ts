// Node runtime only (NOT Edge)
export const runtime = 'nodejs';

import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  const name = process.env.MONGODB_DB || 'aasaasi_db';
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (db) return db;
  if (!client) client = new MongoClient(uri);
  await client.connect();
  db = client.db(name);
  return db;
}
