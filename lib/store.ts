import { Redis } from "@upstash/redis";

export interface Sermon {
  id: string;
  date: string; // YYYY-MM-DD
  durationSeconds: number;
}

export interface Guess {
  name: string;
  guessSeconds: number;
  submittedAt: string;
}

const mem: Record<string, unknown> = {};

function getRedis(): Redis | null {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
  }
  return null;
}

async function kget<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return (mem[key] as T) ?? null;
  try { return await r.get<T>(key); } catch { return null; }
}

async function kset(key: string, value: unknown): Promise<void> {
  const r = getRedis();
  if (!r) { mem[key] = value; return; }
  await r.set(key, value);
}

export async function getSermons(): Promise<Sermon[]> {
  const val = await kget<Sermon[]>("sermons");
  return Array.isArray(val) ? val : [];
}

export async function saveSermons(sermons: Sermon[]): Promise<void> {
  await kset("sermons", [...sermons].sort((a, b) => a.date.localeCompare(b.date)));
}

export async function getGuesses(date: string): Promise<Guess[]> {
  const val = await kget<Guess[]>(`guesses:${date}`);
  return Array.isArray(val) ? val : [];
}

export async function saveGuesses(date: string, guesses: Guess[]): Promise<void> {
  await kset(`guesses:${date}`, guesses);
}

export interface Standing {
  name: string;
  points: number;
  guesses: number;
  wins: string[];
}

const PLAYERS = ["Matt", "Marty", "Brendan", "Brandon", "Dave"];

export async function getLeaderboard(): Promise<Standing[]> {
  const sermons = await getSermons();
  const standings = new Map<string, Standing>(
    PLAYERS.map(n => [n, { name: n, points: 0, guesses: 0, wins: [] }])
  );

  for (const sermon of sermons) {
    const guesses = await getGuesses(sermon.date);
    const playerGuesses = guesses.filter(g => PLAYERS.includes(g.name));

    for (const g of playerGuesses) {
      standings.get(g.name)!.guesses++;
    }

    const valid = playerGuesses.filter(g => g.guessSeconds <= sermon.durationSeconds);
    if (valid.length === 0) continue;

    const best = Math.max(...valid.map(g => g.guessSeconds));
    const winners = valid.filter(g => g.guessSeconds === best);
    for (const w of winners) {
      const s = standings.get(w.name)!;
      s.points++;
      s.wins.push(sermon.date);
    }
  }

  return PLAYERS.map(n => standings.get(n)!).sort((a, b) => b.points - a.points || b.guesses - a.guesses);
}