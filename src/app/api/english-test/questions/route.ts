// src/app/api/health/route.ts (only used if you run Next.js App Router)
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
export const runtime = 'nodejs';

const g = globalThis as any;

function getUri() {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    process.env.MONGO_URL || ''
  );
}
function getDbName() {
  return (
    process.env.MONGODB_DB ||
    process.env.MONGO_DB ||
    process.env.MONGO_DATABASE ||
    'aasaasi_db'
  );
}

async function getDb() {
  const uri = getUri();
  const name = getDbName();
  if (!uri || !name) throw new Error('Missing MONGO_URL or MONGO_DB');

  if (!g.__mongoClient) g.__mongoClient = new MongoClient(uri);
  if (!g.__mongoClient.topology?.isConnected?.()) {
    await g.__mongoClient.connect();
  }
  return g.__mongoClient.db(name);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '0', 10) || 0, 50);
    const db = await getDb();

    if (limit > 0) {
      const docs = await db
        .collection('english_test_questions')
        .aggregate([{ $sample: { size: limit } }])
        .toArray();
      return NextResponse.json(docs);
    }

    const [dict, etq] = await Promise.all([
      db.collection('dictionary').estimatedDocumentCount(),
      db.collection('english_test_questions').estimatedDocumentCount(),
    ]);

    return NextResponse.json({
      status: 'ok',
      db: 'up',
      counts: { dictionary: dict, english_test_questions: etq },
    });
  } catch (e: any) {
    return NextResponse.json(
      { status: 'ok', db: 'down', err: String(e?.message || e) },
      { status: 200 }
    );
  }
}
