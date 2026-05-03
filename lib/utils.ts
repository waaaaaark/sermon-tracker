export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function parseDuration(minutes: number, seconds: number): number {
  return minutes * 60 + seconds;
}

export function formatDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getNextSunday(): string {
  const today = new Date();
  const day = today.getDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntilSunday);
  return next.toISOString().split("T")[0];
}

export function isSunday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}
