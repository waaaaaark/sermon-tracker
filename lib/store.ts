import { Redis } from "@upstash/redis";

export interface Sermon {
  id: string;
  date: string;
  durationSeconds: number;
  hadChildrensSermon?: boolean | null; // null = not recorded
}

export interface Guess {
  name: string;
  guessSeconds: number;
  submittedAt: string;
  childrensSermonBet?: "yes" | "no" | null; // null/undefined = abstain
}

export interface LiveSermon {
  startedAt: number;
  date: string;
}

export interface Resolution {
  date: string;
  durationSeconds: number;
  winner: string | null;
  winnerGuessSeconds: number | null;
  winnerPoints: number; // 1 or 2
  resolvedAt: string;
}

export interface Standing {
  name: string;
  points: number;
  guesses: number;
  wins: string[];
  childrensSermonPoints: number;
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
  if (exSeconds) await r.set(key, value, { ex: exSeconds });
  else await r.set(key, value);
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
  await kset("resolution", r, 60 * 60 * 25);
}

// ── Point overrides ───────────────────────────────────────────────────────────

export async function getPointOverrides(): Promise<Record<string, number>> {
  const val = await kget<Record<string, number>>("pointOverrides");
  return val ?? {};
}

export async function setPointOverrides(overrides: Record<string, number>): Promise<void> {
  await kset("pointOverrides", overrides);
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<Standing[]> {
  const sermons = await getSermons();
  const standings = new Map<string, Standing>(
    PLAYERS.map(n => [n, { name: n, points: 0, guesses: 0, wins: [], childrensSermonPoints: 0 }])
  );

  // Running average used for weighting — computed progressively
  let totalSeconds = 0;
  let sermonCount = 0;

  for (const sermon of sermons) {
    const guesses = await getGuesses(sermon.date);
    const playerGuesses = guesses.filter(g => PLAYERS.includes(g.name));
    for (const g of playerGuesses) standings.get(g.name)!.guesses++;

    // ── Sermon length scoring ──────────────────────────────────────────────
    if (playerGuesses.length > 0) {
      const minDiff = Math.min(...playerGuesses.map(g => Math.abs(g.guessSeconds - sermon.durationSeconds)));
      const winners = playerGuesses.filter(g => Math.abs(g.guessSeconds - sermon.durationSeconds) === minDiff);

      // Weighted: if running avg exists and winner is >2min outside it, award 2 pts
      const runningAvg = sermonCount > 0 ? totalSeconds / sermonCount : null;
      const THRESHOLD = 120; // 2 minutes in seconds

      for (const w of winners) {
        const s = standings.get(w.name)!;
        let pts = 1;
        if (runningAvg !== null && Math.abs(w.guessSeconds - runningAvg) > THRESHOLD) {
          pts = 2;
        }
        s.points += pts;
        s.wins.push(sermon.date);
      }
    }

    // ── Children's sermon scoring ──────────────────────────────────────────
    if (sermon.hadChildrensSermon !== null && sermon.hadChildrensSermon !== undefined) {
      for (const g of playerGuesses) {
        if (!g.childrensSermonBet) continue; // abstain
        const s = standings.get(g.name)!;
        if (
          (g.childrensSermonBet === "yes" && sermon.hadChildrensSermon) ||
          (g.childrensSermonBet === "no" && !sermon.hadChildrensSermon)
        ) {
          s.childrensSermonPoints++;
        } else {
          s.childrensSermonPoints--;
        }
      }
    }

    totalSeconds += sermon.durationSeconds;
    sermonCount++;
  }

  const overrides = await getPointOverrides();

  return PLAYERS.map(n => {
    const s = standings.get(n)!;
    const override = overrides[n] ?? 0;
    return { ...s, points: s.points + s.childrensSermonPoints + override };
  }).sort((a, b) => b.points - a.points || b.guesses - a.guesses);
}

// ── Score a sermon ────────────────────────────────────────────────────────────

export async function scoreSermon(
  date: string,
  durationSeconds: number,
  hadChildrensSermon: boolean | null
): Promise<Resolution> {
  const sermons = await getSermons();
  const guesses = await getGuesses(date);
  const playerGuesses = guesses.filter(g => PLAYERS.includes(g.name));

  // Running average BEFORE this sermon
  const prior = sermons.filter(s => s.date < date);
  const runningAvg = prior.length > 0
    ? prior.reduce((sum, s) => sum + s.durationSeconds, 0) / prior.length
    : null;

  const THRESHOLD = 120;

  let winner: string | null = null;
  let winnerGuessSeconds: number | null = null;
  let winnerPoints = 1;

  if (playerGuesses.length > 0) {
    const minDiff = Math.min(...playerGuesses.map(g => Math.abs(g.guessSeconds - durationSeconds)));
    const winners = playerGuesses.filter(g => Math.abs(g.guessSeconds - durationSeconds) === minDiff);
    winner = winners.map(g => g.name).join(" & ");
    winnerGuessSeconds = winners[0].guessSeconds;
    if (runningAvg !== null && Math.abs(winnerGuessSeconds - runningAvg) > THRESHOLD) {
      winnerPoints = 2;
    }
  }

  const resolution: Resolution = {
    date, durationSeconds, winner, winnerGuessSeconds, winnerPoints,
    resolvedAt: new Date().toISOString(),
  };
  await saveResolution(resolution);

  // Also update sermon with hadChildrensSermon
  void hadChildrensSermon; // handled in sermons route

  return resolution;
}
