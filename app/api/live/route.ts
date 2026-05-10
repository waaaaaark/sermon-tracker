import { NextRequest, NextResponse } from "next/server";
import { getLive, setLive, clearLive } from "@/lib/store";

export async function GET() {
  const live = await getLive();
  return NextResponse.json(live ?? null);
}

export async function POST(req: NextRequest) {
  const { startedAt, date } = await req.json();
  if (!startedAt || !date) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  await setLive({ startedAt, date });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearLive();
  return NextResponse.json({ ok: true });
}
