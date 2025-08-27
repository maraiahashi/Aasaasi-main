export default async function handler(req: any, res: any) {
  try {
    const dbmod = await import("./_db");
    const env = dbmod.debugEnv();
    try {
      const db = await dbmod.getDb();
      const [dictionary, english_test_questions] = await Promise.all([
        db.collection("dictionary").countDocuments(),
        db.collection("english_test_questions").countDocuments(),
      ]);
      res.status(200).json({ status: "ok", db: "up", counts: { dictionary, english_test_questions }, env });
    } catch (e: any) {
      res.status(200).json({ status: "ok", db: "down", err: e?.message || String(e), env });
    }
  } catch (e: any) {
    res.status(200).json({ status: "ok", db: "down", err: e?.message || String(e) });
  }
}
