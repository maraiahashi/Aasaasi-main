import { MongoClient, Db } from "mongodb";

const uri =
  (process.env.MONGO_URL && process.env.MONGO_URL.trim()) ||
  (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) ||
  "";

const dbName =
  (process.env.MONGO_DB && process.env.MONGO_DB.trim()) ||
  (process.env.MONGODB_DB && process.env.MONGODB_DB.trim()) ||
  "aasaasi_db";

if (!uri || !dbName) {
  throw new Error("Missing Mongo connection env: set MONGO_URL/MONGO_DB or MONGODB_URI/MONGODB_DB");
}

type G = typeof globalThis & { __client?: MongoClient; __db?: Db; };
const g = globalThis as G;

export async function getDb(): Promise<Db> {
  if (g.__db) return g.__db;
  if (!g.__client) {
    g.__client = new MongoClient(uri);
    await g.__client.connect();
  }
  g.__db = g.__client.db(dbName);
  return g.__db;
}
