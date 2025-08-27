import { NextResponse } from "next/server";
import { getDictionary } from "@/src/lib/localdb";
export const runtime = "nodejs";

function esc(s: string){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const term = (searchParams.get("term") || "").trim();
  const dir  = (searchParams.get("dir") || "en-so").toLowerCase();
  if (!term) return NextResponse.json([]);

  const field = dir.startsWith("en") ? "english" : "somali";
  const re = new RegExp("^" + esc(term), "i");

  const rows = getDictionary()
    .filter((d: any) => typeof d[field] === "string" && re.test(d[field]))
    .slice(0, 15)
    .map((d: any) => d[field]);

  return NextResponse.json(rows);
}
