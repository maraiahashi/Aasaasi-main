import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const term = (searchParams.get("term") || "").trim();
  const dir = (searchParams.get("dir") || "en-so").toLowerCase();

  if (!term) return NextResponse.json([]);

  const field = dir.startsWith("en") ? "english" : "somali";

  try {
    const db = await getDb();
    const docs = await db
      .collection("dictionary")
      .find({ [field]: { $regex: "^" + escapeRegex(term), $options: "i" } },
            { projection: { _id: 0, [field]: 1 } })
      .limit(15)
      .toArray();

    const out = docs
      .map((d: any) => d[field])
      .filter((v: any) => typeof v === "string" && v.length);

    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json({ detail: "DB not ready", error: err?.message || String(err) }, { status: 503 });
  }
}
