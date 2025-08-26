import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const term = (searchParams.get("term") || "").trim();
  const dir = (searchParams.get("dir") || "en-so").toLowerCase();

  if (!term) {
    return NextResponse.json({ detail: "Missing term" }, { status: 400 });
  }

  const fieldIn  = dir.startsWith("en") ? "english" : "somali";
  const fieldOut = dir.startsWith("en") ? "somali"  : "english";

  try {
    const db = await getDb();
    const doc = await db.collection("dictionary").findOne(
      { [fieldIn]: term },
      { projection: { _id: 0, english: 1, somali: 1, pos: 1, pronunciation: 1, source: 1, updatedAt: 1 } }
    );

    if (!doc) {
      return NextResponse.json({ detail: "Word not found" }, { status: 404 });
    }

    return NextResponse.json({
      [fieldIn]: (doc as any)[fieldIn],
      [fieldOut]: (doc as any)[fieldOut],
      pos: (doc as any).pos || null,
      pronunciation: (doc as any).pronunciation || null,
      source: (doc as any).source || null,
      updatedAt: (doc as any).updatedAt || null
    });
  } catch (err: any) {
    return NextResponse.json({ detail: "DB not ready", error: err?.message || String(err) }, { status: 503 });
  }
}
