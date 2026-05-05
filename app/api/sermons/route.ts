import { NextRequest, NextResponse } from "next/server";
import { getSermons, saveSermons, Sermon } from "@/lib/store";
import { randomUUID } from "crypto";

export async function GET() {
  const sermons = await getSermons();
  return NextResponse.json(sermons);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, minutes, seconds, speaker, title } = body;

  if (!date || minutes == null || seconds == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const sermon: Sermon = {
    id: randomUUID(),
    date,
    durationSeconds: Number(minutes) * 60 + Number(seconds),
    speaker: speaker?.trim() || undefined,
    title: title?.trim() || undefined,
  };

  const sermons = await getSermons();
  // Replace if same date exists
  const idx = sermons.findIndex((s) => s.date === date);
  if (idx >= 0) sermons[idx] = { ...sermon, id: sermons[idx].id };
  else sermons.push(sermon);

  await saveSermons(sermons);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const sermons = await getSermons();
  await saveSermons(sermons.filter((s) => s.id !== id));
  return NextResponse.json({ ok: true });
}
