import { NextRequest, NextResponse } from "next/server";
import { getSermons, saveSermons, Sermon, scoreSermon } from "@/lib/store";
import { randomUUID } from "crypto";

export async function GET() {
  const sermons = await getSermons();
  return NextResponse.json(sermons);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, minutes, seconds, hadChildrensSermon } = body;
  if (!date || minutes == null || seconds == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const durationSeconds = Number(minutes) * 60 + Number(seconds);
  // hadChildrensSermon: true | false | null (not provided)
  const childrens = hadChildrensSermon === true ? true : hadChildrensSermon === false ? false : null;

  const sermon: Sermon = { id: randomUUID(), date, durationSeconds, hadChildrensSermon: childrens };
  const sermons = await getSermons();
  const idx = sermons.findIndex((s) => s.date === date);
  if (idx >= 0) sermons[idx] = { ...sermon, id: sermons[idx].id };
  else sermons.push(sermon);
  await saveSermons(sermons);
  await scoreSermon(date, durationSeconds, childrens);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const sermons = await getSermons();
  await saveSermons(sermons.filter((s) => s.id !== id));
  return NextResponse.json({ ok: true });
}
