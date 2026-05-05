import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/store";

export async function GET() {
  const board = await getLeaderboard();
  return NextResponse.json(board);
}