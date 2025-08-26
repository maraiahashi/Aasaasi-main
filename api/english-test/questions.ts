export default async function handler(req: any, res: any) {
  const { getDb } = await import("../../_db");
  const url = new URL(req.url, `http://${req.headers.host}`);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "12", 10), 50);
  try {
    const db = await getDb();
    const docs = await db.collection("english_test_questions")
      .aggregate([{ $sample: { size: limit } }]).toArray();

    // minimal shape compatible with your grader/client
    const out = docs.map((d: any) => {
      const opts = [d.correct, d.distractor1, d.distractor2, d.distractor3].filter(Boolean);
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      return { id: String(d._id), question: d.question, options: opts };
    });

    res.status(200).json({ questions: out });
  } catch (e: any) {
    res.status(503).json({ detail: "DB not ready", error: e?.message || String(e) });
  }
}
