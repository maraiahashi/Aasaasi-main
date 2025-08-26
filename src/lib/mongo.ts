import { MongoClient, Db } from "mongodb";

const uri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  "";

const dbName =
  process.env.MONGODB_DB ||
  process.env.MONGO_DB ||
  "aasaasi_db";

if (!uri) {
  throw new Error("Missing Mongo URI (set MONGODB_URI or MONGO_URL)");
}

type G = typeof globalThis & { __mongoClient?: MongoClient; __mongoDb?: Db; };
const g = globalThis as G;

export async function getDb(): Promise<Db> {
  if (g.__mongoDb) return g.__mongoDb;
  const client = g.__mongoClient ?? new MongoClient(uri);
  if (!g.__mongoClient) {
    await client.connect();
    g.__mongoClient = client;
  }
  g.__mongoDb = client.db(dbName);
  return g.__mongoDb;
}

export async function ping(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
