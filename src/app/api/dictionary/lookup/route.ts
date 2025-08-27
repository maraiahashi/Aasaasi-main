import { NextResponse } from "next/server";
import { getDictionary } from "@/src/lib/localdb";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const term = (searchParams.get("term") || "").trim();
  const dir  = (searchParams.get("dir")  || "en-so").toLowerCase();
  if (!term) return NextResponse.json({ detail: "Missing term" }, { status: 400 });

  const fieldIn  = dir.startsWith("en") ? "english" : "somali";
  const fieldOut = dir.startsWith("en") ? "somali"  : "english";

  const doc = getDictionary().find((d: any) => d[fieldIn] === term);
  if (!doc) return NextResponse.json({ detail: "Word not found" }, { status: 404 });

  return NextResponse.json({
    [fieldIn]:  doc[fieldIn],
    [fieldOut]: doc[fieldOut],
    pos: doc.pos ?? null,
    pronunciation: doc.pronunciation ?? null,
    source: doc.source ?? null,
    updatedAt: doc.updatedAt ?? null,
  });
}
