import { Redis } from "@upstash/redis";

export interface Sermon {
  id: string;
  date: string; // YYYY-MM-DD
  durationSeconds: number;
  speaker?: string;
  title?: string;
}

const mem: Record<string, unknown> = {};

function getRedis(): Redis | null {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return null;
}

async function kget<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return (mem[key] as T) ?? null;
  return r.get<T>(key);
}

async function kset(key: string, value: unknown): Promise<void> {
  const r = getRedis();
  if (!r) { mem[key] = value; return; }
  await r.set(key, JSON.stringify(value));
}

export async function getSermons(): Promise<Sermon[]> {
  const raw = await kget<string>("sermons");
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export async function saveSermons(sermons: Sermon[]): Promise<void> {
  const sorted = [...sermons].sort((a, b) => a.date.localeCompare(b.date));
  await kset("sermons", sorted);
}
