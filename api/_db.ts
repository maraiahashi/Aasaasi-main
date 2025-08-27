import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

function readEnv() {
  const uri =
    (process.env.MONGO_URL?.trim() || process.env.MONGODB_URI?.trim() || "");
  const dbName =
    (process.env.MONGO_DB?.trim() || process.env.MONGODB_DB?.trim() || "aasaasi_db");
  return { uri, dbName };
}

export function debugEnv() {
  const { uri, dbName } = readEnv();
  return {
    have_MONGO_URL: !!process.env.MONGO_URL,
    have_MONGODB_URI: !!process.env.MONGODB_URI,
    have_MONGO_DB: !!process.env.MONGO_DB,
    have_MONGODB_DB: !!process.env.MONGODB_DB,
    using: process.env.MONGO_URL ? "MONGO_URL" : (process.env.MONGODB_URI ? "MONGODB_URI" : "none"),
    dbName,
    uriHasNewline: /\r|\n/.test(uri),
    uriPrefix: uri ? uri.slice(0, 40) : null
  };
}

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const { uri, dbName } = readEnv();
  if (!uri || !dbName) throw new Error("Missing Mongo env: set MONGO_URL/MONGO_DB or MONGODB_URI/MONGODB_DB");
  if (/\r|\n/.test(uri)) throw new Error("MONGO_URL/MONGODB_URI contains a newline — re-add as a single line.");

  if (!cachedClient) { cachedClient = new MongoClient(uri); await cachedClient.connect(); }
  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}
