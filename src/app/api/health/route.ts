import { NextResponse } from "next/server";
export const runtime = "nodejs"; // Route Handlers run on server – fs is allowed in node runtime
export async function GET() {
  return NextResponse.json({ status: "ok", db: "local-json" });
}
