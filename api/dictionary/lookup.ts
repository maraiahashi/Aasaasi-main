export default async function handler(req: any, res: any) {
  const { getDb } = await import("../_db");
  const url = new URL(req.url, `http://${req.headers.host}`);
  const term = (url.searchParams.get("term") || "").trim();
  const dir = (url.searchParams.get("dir") || "en-so").toLowerCase();

  if (!term) return res.status(400).json({ detail: "Missing term" });

  const fieldIn  = dir.startsWith("en") ? "english" : "somali";
  const fieldOut = dir.startsWith("en") ? "somali"  : "english";

  try {
    const db = await getDb();
    const doc = await db.collection("dictionary").findOne(
      { [fieldIn]: term },
      { projection: { _id: 0, english: 1, somali: 1, pos: 1, pronunciation: 1, source: 1, updatedAt: 1 } }
    );
    if (!doc) return res.status(404).json({ detail: "Word not found" });

    res.status(200).json({
      [fieldIn]:  (doc as any)[fieldIn],
      [fieldOut]: (doc as any)[fieldOut],
      pos: (doc as any).pos || null,
      pronunciation: (doc as any).pronunciation || null,
      source: (doc as any).source || null,
      updatedAt: (doc as any).updatedAt || null
    });
  } catch (e: any) {
    res.status(503).json({ detail: "DB not ready", error: e?.message || String(e) });
  }
}
