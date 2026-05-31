import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getPointOverrides, setPointOverrides } from "@/lib/store";

const PLAYERS = ["Matt", "Marty", "Brendan", "Brandon", "Dave"];

export async function GET() {
  const [standings, overrides] = await Promise.all([getLeaderboard(), getPointOverrides()]);
  const players = standings.map(s => ({
    name: s.name,
    base: s.points - (overrides[s.name] ?? 0),
    override: overrides[s.name] ?? 0,
    total: s.points,
    guesses: s.guesses,
  }));
  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { overrides } = body;
  if (typeof overrides !== "object" || overrides === null) {
    return NextResponse.json({ error: "Invalid overrides" }, { status: 400 });
  }
  const clean: Record<string, number> = {};
  for (const name of PLAYERS) {
    if (name in overrides) {
      const v = Number(overrides[name]);
      if (isNaN(v)) return NextResponse.json({ error: `Invalid value for ${name}` }, { status: 400 });
      clean[name] = v;
    }
  }
  await setPointOverrides(clean);
  return NextResponse.json({ ok: true });
}
