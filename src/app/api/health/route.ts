import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const [dictionary, english_test_questions] = await Promise.all([
      db.collection("dictionary").countDocuments(),
      db.collection("english_test_questions").countDocuments(),
    ]);
    return NextResponse.json({
      status: "ok",
      db: "up",
      counts: { dictionary, english_test_questions },
      using: {
        uri: process.env.MONGODB_URI ? "MONGODB_URI" : (process.env.MONGO_URL ? "MONGO_URL" : "none"),
        dbVar: process.env.MONGODB_DB ? "MONGODB_DB" : (process.env.MONGO_DB ? "MONGO_DB" : "default:aasaasi_db"),
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "ok", db: "down", err: err?.message || String(err) },
      { status: 503 }
    );
  }
}
