import { NextResponse } from "next/server";
import { getEnglishTestQuestions } from "@/src/lib/localdb";
export const runtime = "nodejs";

function shuffle<T>(a: T[]): T[] {
  for (let i=a.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 50);

  const pool = getEnglishTestQuestions();
  const pick: any[] = [];
  const used = new Set<number>();
  while (pick.length < Math.min(limit, pool.length)) {
    const i = Math.floor(Math.random()*pool.length);
    if (!used.has(i)) { used.add(i); pick.push(pool[i]); }
  }
  const out = pick.map((d: any) => {
    const opts = [d.correct, d.distractor1, d.distractor2, d.distractor3].filter(Boolean);
    return { id: String(d._id || d.id || crypto.randomUUID()), question: d.question, options: shuffle(opts) };
  });
  return NextResponse.json({ questions: out });
}
