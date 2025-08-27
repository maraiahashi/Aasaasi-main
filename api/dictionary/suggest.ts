function escapeRegex(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export default async function handler(req: any, res: any) {
  try {
    const { getDb } = await import("../_db.js");  // NOTE: ../ and .js
    const url = new URL(req.url, `http://${req.headers.host}`);
    const term = (url.searchParams.get("term") || "").trim();
    const dir = (url.searchParams.get("dir") || "en-so").toLowerCase();
    if (!term) return res.status(200).json([]);
    const field = dir.startsWith("en") ? "english" : "somali";
    const db = await getDb();
    const docs = await db.collection("dictionary")
      .find({ [field]: { $regex: "^" + escapeRegex(term), $options: "i" } }, { projection: { _id: 0, [field]: 1 } })
      .limit(15).toArray();
    res.status(200).json(docs.map((d: any) => d[field]).filter((v: any) => typeof v === "string" && v.length));
  } catch (e: any) {
    res.status(503).json({ detail: "DB not ready", error: e?.message || String(e) });
  }
}
