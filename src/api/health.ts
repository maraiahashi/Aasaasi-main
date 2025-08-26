import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

const g = globalThis as any;
const getUri = () =>
  process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URL || '';
const getDbName = () =>
  process.env.MONGODB_DB || process.env.MONGO_DB || process.env.MONGO_DATABASE || 'aasaasi_db';

async function getDb() {
  const uri = getUri();
  const name = getDbName();
  if (!uri || !name) throw new Error('Missing MONGO_URL or MONGO_DB');
  if (!g.__mongoClient) g.__mongoClient = new MongoClient(uri);
  if (!g.__mongoClient.topology?.isConnected?.()) await g.__mongoClient.connect();
  return g.__mongoClient.db(name);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await getDb();
    const limit = Math.min(parseInt(String(req.query.limit ?? '0'), 10) || 0, 50);

    if (limit > 0) {
      const docs = await db.collection('english_test_questions')
        .aggregate([{ $sample: { size: limit } }]).toArray();
      return res.status(200).json(docs);
    }

    const [dict, etq] = await Promise.all([
      db.collection('dictionary').estimatedDocumentCount(),
      db.collection('english_test_questions').estimatedDocumentCount(),
    ]);
    return res.status(200).json({ status: 'ok', db: 'up', counts: { dictionary: dict, english_test_questions: etq } });
  } catch (e: any) {
    return res.status(200).json({ status: 'ok', db: 'down', err: String(e?.message || e) });
  }
}
