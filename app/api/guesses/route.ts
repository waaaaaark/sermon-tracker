import { NextRequest, NextResponse } from "next/server";
import { getGuesses, addGuess, getSermons } from "@/lib/store";
import { parseDuration } from "@/lib/utils";
import { randomUUID } from "crypto";

export async function GET() {
  const guesses = await getGuesses();
  return NextResponse.json(guesses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sermonDate, name, minutes, seconds } = body;

  if (!sermonDate || !name || minutes === undefined || seconds === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!name.trim() || name.trim().length > 40) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const guessSeconds = parseDuration(Number(minutes), Number(seconds));
  if (guessSeconds < 60 || guessSeconds > 7200) {
    return NextResponse.json(
      { error: "Guess must be between 1 and 120 minutes" },
      { status: 400 }
    );
  }

  // Check: don't allow guessing on a date that already has a result
  const sermons = await getSermons();
  const hasResult = sermons.some((s) => s.date === sermonDate);
  if (hasResult) {
    return NextResponse.json(
      { error: "That sermon already has a recorded result." },
      { status: 400 }
    );
  }

  const guess = {
    id: randomUUID(),
    sermonDate,
    name: name.trim(),
    guessSeconds,
    submittedAt: new Date().toISOString(),
  };

  await addGuess(guess);
  return NextResponse.json({ success: true, guess });
}
