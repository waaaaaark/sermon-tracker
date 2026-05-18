import { NextRequest, NextResponse } from "next/server";
import { getGuesses, saveGuesses, Guess } from "@/lib/store";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });
  const guesses = await getGuesses(date);
  return NextResponse.json(guesses);
}

export async function POST(req: NextRequest) {
  const { date, name, guessSeconds, childrensSermonBet } = await req.json();
  if (!date || !name || guessSeconds == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const NAMES = ["Matt", "Marty", "Brendan", "Brandon", "Dave", "Guest"];
  if (!NAMES.includes(name)) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const now = new Date();
  const nowCT = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const [y, m, d] = date.split("-").map(Number);
  const sundayCT = new Date(y, m - 1, d, 10, 35, 0);
  if (nowCT >= sundayCT) {
    return NextResponse.json({ error: "Guesses are closed for this Sunday (cutoff is 10:35 AM CT)." }, { status: 400 });
  }

  const guesses = await getGuesses(date);
  const idx = guesses.findIndex(g => g.name === name);
  const bet = childrensSermonBet === "yes" ? "yes" : childrensSermonBet === "no" ? "no" : null;
  const guess: Guess = { name, guessSeconds, submittedAt: now.toISOString(), childrensSermonBet: bet };
  if (idx >= 0) guesses[idx] = guess;
  else guesses.push(guess);

  await saveGuesses(date, guesses);
  return NextResponse.json({ ok: true });
}
