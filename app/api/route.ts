import { NextRequest, NextResponse } from "next/server";
import { getGuesses, saveGuesses, Guess } from "@/lib/store";

// Test-only route — no cutoff enforcement, allows deleting all guesses for a date

export async function POST(req: NextRequest) {
  const { date, name, guessSeconds } = await req.json();
  if (!date || !name || guessSeconds == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const guesses = await getGuesses(date);
  const idx = guesses.findIndex(g => g.name === name);
  const guess: Guess = { name, guessSeconds, submittedAt: new Date().toISOString() };
  if (idx >= 0) guesses[idx] = guess; else guesses.push(guess);
  await saveGuesses(date, guesses);
  return NextResponse.json({ ok: true, guess });
}

export async function DELETE(req: NextRequest) {
  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });
  await saveGuesses(date, []);
  return NextResponse.json({ ok: true });
}