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
  runnerUp?: string | null;
  runnerUpGuessSeconds?: number | null;
  boldestCall?: { name: string; guessSeconds: number } | null;
  childrensWinners?: string[];
  allGuesses?: { name: string; guessSeconds: number; diff: number }[];
}

export interface Standing {
  name: string;
  points: number;
  guesses: number;
  wins: string[];
  childrensSermonPoints: number;
  hotStreak: number;
  coldStreak: number;
  achievements: string[];
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
    PLAYERS.map(n => [n, { name: n, points: 0, guesses: 0, wins: [], childrensSermonPoints: 0, hotStreak: 0, coldStreak: 0, achievements: [] }])
  );

  // Per-player history and margin tracking for streaks + achievements
  const playerHistory = new Map<string, { guessed: boolean; won: boolean }[]>(
    PLAYERS.map(n => [n, []])
  );
  const playerMargins = new Map<string, number[]>(PLAYERS.map(n => [n, []]));
  const achievements = new Map<string, Set<string>>(PLAYERS.map(n => [n, new Set()]));

  let totalSeconds = 0;
  let sermonCount = 0;
  const THRESHOLD = 120;

  for (const sermon of sermons) {
    const guesses = await getGuesses(sermon.date);
    const playerGuesses = guesses.filter(g => PLAYERS.includes(g.name));
    for (const g of playerGuesses) {
      standings.get(g.name)!.guesses++;
      playerMargins.get(g.name)!.push(Math.abs(g.guessSeconds - sermon.durationSeconds));
    }

    const winnerNames = new Set<string>();

    if (playerGuesses.length > 0) {
      const minDiff = Math.min(...playerGuesses.map(g => Math.abs(g.guessSeconds - sermon.durationSeconds)));
      const winners = playerGuesses.filter(g => Math.abs(g.guessSeconds - sermon.durationSeconds) === minDiff);
      const runningAvg = sermonCount > 0 ? totalSeconds / sermonCount : null;

      for (const w of winners) {
        const s = standings.get(w.name)!;
        let pts = 1;
        if (runningAvg !== null && Math.abs(w.guessSeconds - runningAvg) > THRESHOLD) {
          pts = 2;
          achievements.get(w.name)!.add("longshot");
        }
        if (Math.abs(w.guessSeconds - sermon.durationSeconds) <= 10) {
          achievements.get(w.name)!.add("crystal_ball");
        }
        s.points += pts;
        s.wins.push(sermon.date);
        winnerNames.add(w.name);
      }
    }

    if (sermon.hadChildrensSermon !== null && sermon.hadChildrensSermon !== undefined) {
      for (const g of playerGuesses) {
        if (!g.childrensSermonBet) continue;
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

    for (const p of PLAYERS) {
      playerHistory.get(p)!.push({
        guessed: playerGuesses.some(g => g.name === p),
        won: winnerNames.has(p),
      });
    }

    totalSeconds += sermon.durationSeconds;
    sermonCount++;
  }

  // Compute streaks and remaining achievements per player
  for (const p of PLAYERS) {
    const history = playerHistory.get(p)!;
    const s = standings.get(p)!;
    const ach = achievements.get(p)!;

    // Streaks: walk backwards until streak type breaks or no-guess week
    let hotStreak = 0, coldStreak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      if (!h.guessed) break;
      if (h.won) {
        if (coldStreak > 0) break;
        hotStreak++;
      } else {
        if (hotStreak > 0) break;
        coldStreak++;
      }
    }
    s.hotStreak = hotStreak;
    s.coldStreak = coldStreak;

    // Faithful: 4+ consecutive weeks with a guess
    let maxConsec = 0, cur = 0;
    for (const h of history) { if (h.guessed) { cur++; maxConsec = Math.max(maxConsec, cur); } else cur = 0; }
    if (maxConsec >= 4) ach.add("faithful");

    // Prophet: 3+ consecutive wins
    let maxWinStreak = 0, curWin = 0;
    for (const h of history) { if (h.won) { curWin++; maxWinStreak = Math.max(maxWinStreak, curWin); } else curWin = 0; }
    if (maxWinStreak >= 3) ach.add("prophet");

    // Sharpshooter: 5+ guesses, avg margin ≤ 60s
    const margins = playerMargins.get(p)!;
    if (margins.length >= 5 && margins.reduce((a, b) => a + b, 0) / margins.length <= 60) {
      ach.add("sharpshooter");
    }

    s.achievements = [...ach];
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

  const prior = sermons.filter(s => s.date < date);
  const runningAvg = prior.length > 0
    ? prior.reduce((sum, s) => sum + s.durationSeconds, 0) / prior.length
    : null;

  const THRESHOLD = 120;

  // Winner
  let winner: string | null = null;
  let winnerGuessSeconds: number | null = null;
  let winnerPoints = 1;

  const ranked = [...playerGuesses]
    .map(g => ({ ...g, diff: Math.abs(g.guessSeconds - durationSeconds) }))
    .sort((a, b) => a.diff - b.diff);

  if (ranked.length > 0) {
    const topDiff = ranked[0].diff;
    const winners = ranked.filter(g => g.diff === topDiff);
    winner = winners.map(g => g.name).join(" & ");
    winnerGuessSeconds = winners[0].guessSeconds;
    if (runningAvg !== null && Math.abs(winnerGuessSeconds - runningAvg) > THRESHOLD) {
      winnerPoints = 2;
    }
  }

  // Runner-up: first player whose diff is strictly greater than the winner's
  let runnerUp: string | null = null;
  let runnerUpGuessSeconds: number | null = null;
  if (ranked.length > 0) {
    const topDiff = ranked[0].diff;
    const ru = ranked.find(g => g.diff > topDiff);
    if (ru) { runnerUp = ru.name; runnerUpGuessSeconds = ru.guessSeconds; }
  }

  // Boldest call: furthest from running average
  let boldestCall: { name: string; guessSeconds: number } | null = null;
  if (runningAvg !== null && playerGuesses.length > 0) {
    const boldest = playerGuesses.reduce((a, b) =>
      Math.abs(a.guessSeconds - runningAvg) > Math.abs(b.guessSeconds - runningAvg) ? a : b
    );
    boldestCall = { name: boldest.name, guessSeconds: boldest.guessSeconds };
  }

  // Children's sermon correct callers
  const childrensWinners: string[] = [];
  if (hadChildrensSermon !== null) {
    for (const g of playerGuesses) {
      if (!g.childrensSermonBet) continue;
      if (
        (g.childrensSermonBet === "yes" && hadChildrensSermon) ||
        (g.childrensSermonBet === "no" && !hadChildrensSermon)
      ) childrensWinners.push(g.name);
    }
  }

  const resolution: Resolution = {
    date, durationSeconds, winner, winnerGuessSeconds, winnerPoints,
    resolvedAt: new Date().toISOString(),
    runnerUp, runnerUpGuessSeconds, boldestCall, childrensWinners,
    allGuesses: ranked.map(g => ({ name: g.name, guessSeconds: g.guessSeconds, diff: g.diff })),
  };
  await saveResolution(resolution);
  return resolution;
}
