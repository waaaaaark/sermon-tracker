import { NextResponse } from "next/server";
import { getSermons } from "@/lib/store";

export async function GET() {
  const sermons = await getSermons();
  return NextResponse.json(sermons);
}
