export default async function handler(req: any, res: any) {
  const { getDb } = await import("./_db");
  try {
    const db = await getDb();
    const [dictionary, english_test_questions] = await Promise.all([
      db.collection("dictionary").countDocuments(),
      db.collection("english_test_questions").countDocuments(),
    ]);
    res.status(200).json({
      status: "ok",
      db: "up",
      counts: { dictionary, english_test_questions },
      using: {
        uri: process.env.MONGODB_URI ? "MONGODB_URI" : (process.env.MONGO_URL ? "MONGO_URL" : "none"),
        dbVar: process.env.MONGODB_DB ? "MONGODB_DB" : (process.env.MONGO_DB ? "MONGO_DB" : "default:aasaasi_db"),
      }
    });
  } catch (e: any) {
    res.status(503).json({ status: "ok", db: "down", err: e?.message || String(e) });
  }
}
