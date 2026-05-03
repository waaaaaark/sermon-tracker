import { Redis } from "@upstash/redis";

export interface Sermon {
  id: string;
  date: string;
  durationSeconds: number;
  title?: string;
  speaker?: string;
}

export interface Guess {
  id: string;
  sermonDate: string;
  name: string;
  guessSeconds: number;
  submittedAt: string;
}

export interface LeaderboardEntry {
  name: string;
  totalGuesses: number;
  avgDiffSeconds: number;
  bestDiffSeconds: number;
  recentScore: number;
}

// In-memory fallback for local dev (no Redis credentials)
const mem: Record<string, string> = {};

function getRedis(): Redis | null {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return null;
}

async function kvGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return mem[key] ?? null;
  const val = await redis.get<string>(key);
  return val ?? null;
}

async function kvSet(key: string, value: string): Promise<void> {
  const redis = getRedis();
  if (!redis) { mem[key] = value; return; }
  await redis.set(key, value);
}

export async function getSermons(): Promise<Sermon[]> {
  const raw = await kvGet("sermons");
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function addSermon(sermon: Sermon): Promise<void> {
  const sermons = await getSermons();
  const idx = sermons.findIndex((s) => s.date === sermon.date);
  if (idx >= 0) sermons[idx] = sermon; else sermons.push(sermon);
  sermons.sort((a, b) => a.date.localeCompare(b.date));
  await kvSet("sermons", JSON.stringify(sermons));
}

export async function deleteSermon(id: string): Promise<void> {
  const sermons = await getSermons();
  await kvSet("sermons", JSON.stringify(sermons.filter((s) => s.id !== id)));
}

export async function getGuesses(): Promise<Guess[]> {
  const raw = await kvGet("guesses");
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function addGuess(guess: Guess): Promise<void> {
  const guesses = await getGuesses();
  guesses.push(guess);
  await kvSet("guesses", JSON.stringify(guesses));
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [sermons, guesses] = await Promise.all([getSermons(), getGuesses()]);
  const sermonMap = new Map(sermons.map((s) => [s.date, s]));
  const scored = guesses.filter((g) => sermonMap.has(g.sermonDate));
  if (scored.length === 0) return [];

  const byName = new Map<string, Guess[]>();
  for (const g of scored) {
    if (!byName.has(g.name)) byName.set(g.name, []);
    byName.get(g.name)!.push(g);
  }

  const entries: LeaderboardEntry[] = [];
  for (const [name, userGuesses] of byName) {
    const diffs = userGuesses.map((g) =>
      Math.abs(g.guessSeconds - sermonMap.get(g.sermonDate)!.durationSeconds)
    );
    const sortedByDate = [...userGuesses].sort((a, b) =>
      b.sermonDate.localeCompare(a.sermonDate)
    );
    const recentDiffs = sortedByDate.slice(0, 4).map((g) =>
      Math.abs(g.guessSeconds - sermonMap.get(g.sermonDate)!.durationSeconds)
    );
    entries.push({
      name,
      totalGuesses: userGuesses.length,
      avgDiffSeconds: diffs.reduce((a, b) => a + b, 0) / diffs.length,
      bestDiffSeconds: Math.min(...diffs),
      recentScore: recentDiffs.reduce((a, b) => a + b, 0) / recentDiffs.length,
    });
  }
  return entries.sort((a, b) => a.recentScore - b.recentScore);
}