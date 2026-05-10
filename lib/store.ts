import { Redis } from "@upstash/redis";

export interface Sermon {
  id: string;
  date: string;
  durationSeconds: number;
}

export interface Guess {
  name: string;
  guessSeconds: number;
  submittedAt: string;
}

export interface LiveSermon {
  startedAt: number; // unix ms timestamp
  date: string;      // YYYY-MM-DD
}

export interface Resolution {
  date: string;
  durationSeconds: number;
  winner: string | null;      // null = nobody won (all over)
  winnerGuessSeconds: number | null;
  resolvedAt: string;         // ISO timestamp
}

export interface Standing {
  name: string;
  points: number;
  guesses: number;
  wins: string[];
}

const mem: Record<string, unknown> = {};
const PLAYERS = ["Matt", "Marty", "Brendan", "Brandon", "Dave"];

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

async function kset(key: string, value: unknown, exSeconds?: number): Promise<void> {
  const r = getRedis();
  if (!r) { mem[key] = value; return; }
  if (exSeconds) {
    await r.set(key, value, { ex: exSeconds });
  } else {
    await r.set(key, value);
  }
}

async function kdel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) { delete mem[key]; return; }
  await r.del(key);
}

// ── Sermons ───────────────────────────────────────────────────────────────────

export async function getSermons(): Promise<Sermon[]> {
  const val = await kget<Sermon[]>("sermons");
  return Array.isArray(val) ? val : [];
}

export async function saveSermons(sermons: Sermon[]): Promise<void> {
  await kset("sermons", [...sermons].sort((a, b) => a.date.localeCompare(b.date)));
}

// ── Guesses ───────────────────────────────────────────────────────────────────

export async function getGuesses(date: string): Promise<Guess[]> {
  const val = await kget<Guess[]>(`guesses:${date}`);
  return Array.isArray(val) ? val : [];
}

export async function saveGuesses(date: string, guesses: Guess[]): Promise<void> {
  await kset(`guesses:${date}`, guesses);
}

// ── Live sermon ───────────────────────────────────────────────────────────────

export async function getLive(): Promise<LiveSermon | null> {
  return kget<LiveSermon>("live");
}

export async function setLive(live: LiveSermon): Promise<void> {
  // Expire after 4 hours just in case it's never cleared
  await kset("live", live, 60 * 60 * 4);
}

export async function clearLive(): Promise<void> {
  await kdel("live");
}

// ── Resolution ────────────────────────────────────────────────────────────────

export async function getResolution(): Promise<Resolution | null> {
  return kget<Resolution>("resolution");
}

export async function saveResolution(r: Resolution): Promise<void> {
  // Keep for 25 hours so it shows for one full day
  await kset("resolution", r, 60 * 60 * 25);
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<Standing[]> {
  const sermons = await getSermons();
  const standings = new Map<string, Standing>(
    PLAYERS.map(n => [n, { name: n, points: 0, guesses: 0, wins: [] }])
  );
  for (const sermon of sermons) {
    const guesses = await getGuesses(sermon.date);
    const playerGuesses = guesses.filter(g => PLAYERS.includes(g.name));
    for (const g of playerGuesses) standings.get(g.name)!.guesses++;
    const valid = playerGuesses.filter(g => g.guessSeconds <= sermon.durationSeconds);
    if (valid.length === 0) continue;
    const best = Math.max(...valid.map(g => g.guessSeconds));
    for (const w of valid.filter(g => g.guessSeconds === best)) {
      const s = standings.get(w.name)!;
      s.points++;
      s.wins.push(sermon.date);
    }
  }
  return PLAYERS.map(n => standings.get(n)!).sort((a, b) => b.points - a.points || b.guesses - a.guesses);
}

// ── Score a sermon (called when sermon is saved) ──────────────────────────────

export async function scoreSermon(date: string, durationSeconds: number): Promise<Resolution> {
  const PLAYER_NAMES = ["Matt", "Marty", "Brendan", "Brandon", "Dave"];
  const guesses = await getGuesses(date);
  const playerGuesses = guesses.filter(g => PLAYER_NAMES.includes(g.name));
  const valid = playerGuesses.filter(g => g.guessSeconds <= durationSeconds);
  
  let winner: string | null = null;
  let winnerGuessSeconds: number | null = null;
  
  if (valid.length > 0) {
    const best = Math.max(...valid.map(g => g.guessSeconds));
    const winners = valid.filter(g => g.guessSeconds === best);
    winner = winners.map(g => g.name).join(" & ");
    winnerGuessSeconds = best;
  }

  const resolution: Resolution = {
    date,
    durationSeconds,
    winner,
    winnerGuessSeconds,
    resolvedAt: new Date().toISOString(),
  };
  await saveResolution(resolution);
  return resolution;
}
