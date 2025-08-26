// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export const runtime = 'nodejs';

let client: MongoClient | null = null;

async function getDb() {
  const uri = process.env.MONGODB_URI;
  const name = process.env.MONGODB_DB || 'aasaasi_db';
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!client) client = new MongoClient(uri);
  await client.connect();
  return client.db(name);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const db = await getDb();

    // Back-compat: if ?limit is present, behave exactly like your old “sample questions” response
    if (searchParams.has('limit')) {
      const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 50);
      const docs = await db
        .collection('english_test_questions')
        .aggregate([
          { $match: { question: { $ne: '' }, correct: { $ne: '' } } },
          { $sample: { size: limit } },
        ])
        .toArray();
      return NextResponse.json(docs);
    }

    // Default: health summary (status + collections + counts)
    const collections = (await db.listCollections().toArray()).map(c => c.name);
    const pairs = await Promise.all(
      collections.map(async (n) => [n, await db.collection(n).countDocuments()] as const)
    );
    const counts = Object.fromEntries(pairs);

    return NextResponse.json({ status: 'ok', db: 'up', collections, counts });
  } catch (e: any) {
    return NextResponse.json(
      { status: 'error', db: 'down', err: String(e?.message || e) },
      { status: 500 },
    );
  }
}
