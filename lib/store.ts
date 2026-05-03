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

// In-memory fallback (local dev / build time)
const mem: Record<string, string> = {};

async function kvGet(key: string): Promise<string | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return mem[key] ?? null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ?? null;
  } catch {
    return mem[key] ?? null;
  }
}

async function kvSet(key: string, value: string): Promise<void> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) { mem[key] = value; return; }
  try {
    await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  } catch {
    mem[key] = value;
  }
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
