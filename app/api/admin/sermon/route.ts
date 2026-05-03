import { NextRequest, NextResponse } from "next/server";
import { addSermon, deleteSermon } from "@/lib/store";
import { parseDuration } from "@/lib/utils";
import { randomUUID } from "crypto";

function checkAdmin(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return key === process.env.ADMIN_KEY;
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { date, minutes, seconds, title, speaker } = body;

  if (!date || minutes === undefined || seconds === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const sermon = {
    id: randomUUID(),
    date,
    durationSeconds: parseDuration(Number(minutes), Number(seconds)),
    title: title || undefined,
    speaker: speaker || undefined,
  };

  await addSermon(sermon);
  return NextResponse.json({ success: true, sermon });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteSermon(id);
  return NextResponse.json({ success: true });
}
