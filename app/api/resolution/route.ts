import { NextResponse } from "next/server";
import { getResolution } from "@/lib/store";

export async function GET() {
  const resolution = await getResolution();
  return NextResponse.json(resolution ?? null);
}
