"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from "recharts";
import HorseRace from "@/components/HorseRace";

interface Sermon { id: string; date: string; durationSeconds: number; }
interface Guess { name: string; guessSeconds: number; submittedAt: string; childrensSermonBet?: "yes" | "no" | null; }
interface Standing { name: string; points: number; guesses: number; wins: string[]; }
interface LiveData { startedAt: number; date: string; }
interface Resolution {
  date: string; durationSeconds: number;
  winner: string | null; winnerGuessSeconds: number | null;
  winnerPoints?: number;
  resolvedAt: string;
}

const NAMES = ["Matt", "Marty", "Brendan", "Brandon", "Dave", "Guest"];
const PLAYERS = ["Matt", "Marty", "Brendan", "Brandon", "Dave"];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function fmtLabel(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec > 0 ? sec + "s" : ""}`.trim();
}
function fmtDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtShort(d: string) {
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
}
function getNextSunday(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function isGuessingOpen(dateStr: string): boolean {
  const now = new Date();
  const nowCT = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const [y, m, d] = dateStr.split("-").map(Number);
  const cutoff = new Date(y, m - 1, d, 10, 35, 0);
  return nowCT < cutoff;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const s: Sermon = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2ddd8", borderRadius: 6, padding: "10px 14px", fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{ color: "#8a837a", marginBottom: 4, fontSize: 11 }}>{fmtDate(s.date)}</div>
      <div style={{ color: "#2d6a4f", fontWeight: 600, fontSize: 16 }}>{fmtLabel(s.durationSeconds)}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ color: "#8a837a", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#f7f5f2", border: "1px solid #e2ddd8", borderRadius: 6,
  color: "#1a1714", padding: "7px 10px", fontSize: 13, outline: "none",
  width: "100%", fontFamily: "'DM Mono', monospace",
};
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2ddd8", borderRadius: 8 };
const sectionLabel: React.CSSProperties = { color: "#b5b0aa", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 };

export default function Home() {
  const isMobile = useIsMobile();
  const pad2 = isMobile ? "16px" : "32px";

  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [live, setLive] = useState<LiveData | null>(null);
  const [liveGuesses, setLiveGuesses] = useState<Guess[]>([]);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [loading, setLoading] = useState(true);

  // sermon add form
  const [showForm, setShowForm] = useState(false);
  const [sDate, setSDate] = useState("");
  const [sMinutes, setSMinutes] = useState(30);
  const [sSeconds, setSSeconds] = useState(0);
  const [sChildrens, setSChildrens] = useState<"yes" | "no" | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  // guess form
  const [gName, setGName] = useState("");
  const [gMinutes, setGMinutes] = useState(25);
  const [gSeconds, setGSeconds] = useState(0);
  const [gChildrensBet, setGChildrensBet] = useState<"yes" | "no" | null>(null);
  const [gSubmitting, setGSubmitting] = useState(false);
  const [gErr, setGErr] = useState("");
  const [gSuccess, setGSuccess] = useState("");

  const nextSunday = getNextSunday();
  const open = isGuessingOpen(nextSunday);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [sRes, gRes, lRes, lvRes, rRes] = await Promise.all([
        fetch("/api/sermons"),
        fetch(`/api/guesses?date=${nextSunday}`),
        fetch("/api/leaderboard"),
        fetch("/api/live"),
        fetch("/api/resolution"),
      ]);
      const [s, g, l, lv, r] = await Promise.all([sRes.json(), gRes.json(), lRes.json(), lvRes.json(), rRes.json()]);
      setSermons(Array.isArray(s) ? s : []);
      setGuesses(Array.isArray(g) ? g : []);
      setStandings(Array.isArray(l) ? l : []);
      setLive(lv);
      setResolution(r);
      if (lv?.date) {
        const lgRes = await fetch(`/api/guesses?date=${lv.date}`);
        const lg = await lgRes.json();
        setLiveGuesses(Array.isArray(lg) ? lg : []);
      } else {
        setLiveGuesses([]);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [nextSunday]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  async function handleSaveSermon() {
    if (!sDate) { setFormErr("Date is required."); return; }
    setSaving(true); setFormErr("");
    const res = await fetch("/api/sermons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: sDate, minutes: sMinutes, seconds: sSeconds, hadChildrensSermon: sChildrens === "yes" ? true : sChildrens === "no" ? false : null }),
    });
    if (res.ok) {
      setShowForm(false); setSDate(""); setSMinutes(30); setSSeconds(0); setSChildrens(null);
      load();
    } else {
      const d = await res.json(); setFormErr(d.error || "Failed to save.");
    }
    setSaving(false);
  }

  async function handleDelete(id: string, dateStr: string) {
    if (!confirm(`Delete entry for ${fmtDate(dateStr)}?`)) return;
    await fetch("/api/sermons", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function handleGuess() {
    if (!gName) { setGErr("Please select your name."); return; }
    setGSubmitting(true); setGErr(""); setGSuccess("");
    const res = await fetch("/api/guesses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: nextSunday, name: gName, guessSeconds: gMinutes * 60 + gSeconds, childrensSermonBet: gChildrensBet }),
    });
    const data = await res.json();
    if (res.ok) {
      const betMsg = gChildrensBet ? ` · children's sermon: ${gChildrensBet}` : "";
      setGSuccess(`Got it, ${gName}! Locked in ${fmtLabel(gMinutes * 60 + gSeconds)}${betMsg}.`);
      load();
    } else {
      setGErr(data.error || "Failed to submit.");
    }
    setGSubmitting(false);
  }

  const sorted = [...sermons].sort((a, b) => a.date.localeCompare(b.date));
  const avg = sermons.length ? sermons.reduce((s, x) => s + x.durationSeconds, 0) / sermons.length : 0;
  const avgMin = avg / 60;
  const latest = sorted[sorted.length - 1];
  const longest = sermons.length ? sermons.reduce((a, b) => a.durationSeconds > b.durationSeconds ? a : b) : null;
  const shortest = sermons.length ? sermons.reduce((a, b) => a.durationSeconds < b.durationSeconds ? a : b) : null;
  const chartData = sorted.map(s => ({ ...s, minutes: s.durationSeconds / 60 }));
  const medals = ["🥇", "🥈", "🥉"];

  void PLAYERS;

  // Children's sermon bet toggle button style
  function betBtnStyle(active: boolean, activeColor: string): React.CSSProperties {
    return {
      background: active ? activeColor : "#f7f5f2",
      color: active ? "#fff" : "#8a837a",
      border: `1px solid ${active ? activeColor : "#e2ddd8"}`,
      borderRadius: 6, padding: "6px 14px", fontSize: 12,
      fontFamily: "'DM Mono', monospace", cursor: "pointer", fontWeight: active ? 600 : 400,
    };
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f7f5f2" }}>

      {/* Header */}
      <header style={{ borderBottom: "1px solid #e2ddd8", background: "#fff", padding: `0 ${pad2}`, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <rect x="9" y="0" width="2" height="6" rx="0.5" fill="#2d6a4f"/>
            <rect x="6.5" y="1.5" width="7" height="2.5" rx="0.5" fill="#2d6a4f"/>
            <path d="M2 11 L10 7 L18 11 Z" fill="#2d6a4f"/>
            <rect x="2" y="11" width="16" height="9" rx="1" fill="#2d6a4f"/>
            <rect x="8" y="15" width="4" height="5" rx="2" fill="#e8f4ef"/>
            <rect x="4" y="13" width="3" height="3" rx="0.5" fill="#a8d5b5" opacity="0.7"/>
            <rect x="13" y="13" width="3" height="3" rx="0.5" fill="#a8d5b5" opacity="0.7"/>
          </svg>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#1a1714" }}>Pew & Pulpit</span>
            {sermons.length > 0 && <span style={{ color: "#b5b0aa", fontSize: 12 }}>{sermons.length} entries</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/timer" style={{ color: "#8a837a", fontSize: 12, textDecoration: "none", padding: "6px 12px", border: "1px solid #e2ddd8", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
            ⏱{!isMobile && " Timer"}
          </Link>
          <button
            onClick={() => { setShowForm(!showForm); setFormErr(""); }}
            style={{ background: showForm ? "#f0ede9" : "#2d6a4f", color: showForm ? "#1a1714" : "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 500, letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
            {showForm ? "Cancel" : "+ Add Sermon"}
          </button>
        </div>
      </header>

      {/* Sermon entry form */}
      {showForm && (
        <div style={{ borderBottom: "1px solid #e2ddd8", background: "#fff", padding: `20px ${pad2}` }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
            <Field label="Date">
              <input type="date" value={sDate} onChange={e => setSDate(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Duration">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" min={0} max={180} value={sMinutes}
                  onChange={e => setSMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ ...inputStyle, width: 64 }} />
                <span style={{ color: "#b5b0aa" }}>m</span>
                <input type="number" min={0} max={59} value={sSeconds}
                  onChange={e => setSSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  style={{ ...inputStyle, width: 64 }} />
                <span style={{ color: "#b5b0aa" }}>s</span>
              </div>
            </Field>
            <Field label="Children's sermon?">
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setSChildrens(sChildrens === "yes" ? null : "yes")} style={betBtnStyle(sChildrens === "yes", "#2d6a4f")}>Yes</button>
                <button onClick={() => setSChildrens(sChildrens === "no" ? null : "no")} style={betBtnStyle(sChildrens === "no", "#c0392b")}>No</button>
                {sChildrens && <button onClick={() => setSChildrens(null)} style={{ ...betBtnStyle(false, ""), fontSize: 11 }}>clear</button>}
              </div>
            </Field>
            <button onClick={handleSaveSermon} disabled={saving}
              style={{ background: "#2d6a4f", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 12, fontWeight: 600, opacity: saving ? 0.6 : 1, marginBottom: 1 }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {formErr && <p style={{ color: "#c0392b", fontSize: 12, marginTop: 8 }}>{formErr}</p>}
        </div>
      )}

      <main style={{ flex: 1, padding: isMobile ? "16px 16px 48px" : "32px 32px 64px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        {loading ? (
          <div style={{ color: "#b5b0aa", paddingTop: 80, textAlign: "center" }}>Loading…</div>
        ) : (
          <>
            {/* ── LIVE RACE ─────────────────────────────────────── */}
            {live && liveGuesses.length > 0 && (
              <div style={{ ...card, padding: "24px", marginBottom: 24, borderColor: "#c0392b", borderWidth: 1.5 }}>
                <div style={{ ...sectionLabel, color: "#c0392b" }}>🔴 Sermon in progress</div>
                <HorseRace startedAt={live.startedAt} guesses={liveGuesses} />
              </div>
            )}
            {live && liveGuesses.length === 0 && (
              <div style={{ ...card, padding: "24px", marginBottom: 24, borderColor: "#c0392b" }}>
                <div style={{ ...sectionLabel, color: "#c0392b" }}>🔴 Sermon in progress</div>
                <p style={{ color: "#8a837a", fontSize: 13 }}>Timer is running — no guesses submitted for today.</p>
              </div>
            )}

            {/* ── RESULTS CARD ──────────────────────────────────── */}
            {!live && resolution && (
              <div style={{ ...card, padding: "24px", marginBottom: 24, background: "#f0faf4", borderColor: "#a8d5b5" }}>
                <div style={{ ...sectionLabel, color: "#2d6a4f" }}>Last Sunday&apos;s result · {fmtDate(resolution.date)}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#8a837a", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Actual duration</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: "#1a1714", lineHeight: 1 }}>
                      {fmtLabel(resolution.durationSeconds)}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    {resolution.winner ? (
                      <>
                        <div style={{ color: "#8a837a", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                          Winner 🏆{resolution.winnerPoints === 2 ? " · 2 pts (bold call!)" : ""}
                        </div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: "#2d6a4f" }}>
                          {resolution.winner}
                        </div>
                        <div style={{ color: "#8a837a", fontSize: 12, marginTop: 2 }}>
                          guessed {fmtLabel(resolution.winnerGuessSeconds!)} — off by {Math.abs(resolution.durationSeconds - resolution.winnerGuessSeconds!)}s
                        </div>
                      </>
                    ) : (
                      <div style={{ color: "#8a837a", fontSize: 13 }}>No guesses were submitted for this Sunday.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── THIS WEEK'S GUESSES (when not live) ───────────── */}
            {!live && guesses.length > 0 && (
              <div style={{ ...card, padding: "24px", marginBottom: 24 }}>
                <div style={sectionLabel}>This week&apos;s guesses · {fmtDate(nextSunday)}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {guesses.map(g => (
                    <div key={g.name} style={{ background: "#f7f5f2", border: "1px solid #e2ddd8", borderRadius: 8, padding: "10px 14px", minWidth: 100 }}>
                      <div style={{ fontSize: 11, color: "#b5b0aa", marginBottom: 4 }}>{g.name}</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#1a1714" }}>{fmtLabel(g.guessSeconds)}</div>
                      {g.childrensSermonBet && (
                        <div style={{ fontSize: 10, marginTop: 4, color: g.childrensSermonBet === "yes" ? "#2d6a4f" : "#c0392b" }}>
                          children&apos;s: {g.childrensSermonBet}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── GUESS SUBMISSION ───────────────────────────────── */}
            {!live && (
              <div style={{ ...card, padding: "24px", marginBottom: 24 }}>
                <div style={sectionLabel}>
                  {guesses.length > 0 ? "Update your guess" : "Make your guess"} · {fmtDate(nextSunday)}
                </div>
                {!open ? (
                  <p style={{ color: "#8a837a", fontSize: 13 }}>Guesses are closed — it&apos;s past 10:35 AM CT. Check back next week!</p>
                ) : gSuccess ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>🎯</span>
                    <div>
                      <p style={{ color: "#2d6a4f", fontWeight: 600, fontSize: 14 }}>{gSuccess}</p>
                      <button onClick={() => setGSuccess("")} style={{ background: "none", border: "none", color: "#b5b0aa", fontSize: 12, padding: 0, marginTop: 4, cursor: "pointer" }}>Change guess</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ color: "#8a837a", fontSize: 13, marginBottom: 20 }}>
                      Closest guess wins. Guesses outside ±2min of the weekly average earn 2 pts. Closes 10:35 AM CT.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <Field label="Who are you?">
                        <select value={gName} onChange={e => setGName(e.target.value)} style={{ ...inputStyle, width: isMobile ? "100%" : 160 }}>
                          <option value="">— select —</option>
                          {NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </Field>
                      <Field label="Sermon length guess">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px" }}>
                            <input type="range" min={5} max={45} value={gMinutes}
                              onChange={e => setGMinutes(parseInt(e.target.value))}
                              style={{ width: "100%", accentColor: "#2d6a4f" }} />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#b5b0aa" }}>
                              <span>5m</span><span>45m</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 22, color: "#1a1714", minWidth: 48 }}>{gMinutes}m</span>
                            <select value={gSeconds} onChange={e => setGSeconds(parseInt(e.target.value))}
                              style={{ ...inputStyle, width: 70, padding: "5px 6px" }}>
                              {[0,5,10,15,20,25,30,35,40,45,50,55].map(s => (
                                <option key={s} value={s}>{s.toString().padStart(2,"0")}s</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </Field>
                      <Field label="Children's sermon? (optional · +1 if right, −1 if wrong)">
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setGChildrensBet(gChildrensBet === "yes" ? null : "yes")} style={betBtnStyle(gChildrensBet === "yes", "#2d6a4f")}>Yes</button>
                          <button onClick={() => setGChildrensBet(gChildrensBet === "no" ? null : "no")} style={betBtnStyle(gChildrensBet === "no", "#c0392b")}>No</button>
                          <span style={{ fontSize: 11, color: "#ccc8c2", alignSelf: "center" }}>or skip to abstain</span>
                        </div>
                      </Field>
                      <button onClick={handleGuess} disabled={gSubmitting}
                        style={{ background: "#2d6a4f", color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 12, fontWeight: 600, opacity: gSubmitting ? 0.6 : 1, width: isMobile ? "100%" : "auto", alignSelf: "flex-start" }}>
                        {gSubmitting ? "Locking in…" : "Lock In Guess"}
                      </button>
                    </div>
                    {gErr && <p style={{ color: "#c0392b", fontSize: 12, marginTop: 8 }}>{gErr}</p>}
                  </>
                )}
              </div>
            )}

            {/* ── Leaderboard + Stats ────────────────────────────── */}
            {sermons.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24, marginBottom: 24 }}>
                <div style={{ ...card, padding: "24px" }}>
                  <div style={sectionLabel}>Leaderboard</div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["", "Name", "Points", "Guesses"].map((h, i) => (
                          <th key={i} style={{ textAlign: i < 2 ? "left" : "right", color: "#b5b0aa", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", paddingBottom: 10, fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr key={s.name} style={{ borderTop: "1px solid #f0ede9" }}>
                          <td style={{ padding: "10px 8px 10px 0", fontSize: 14, width: 24 }}>
                            {i < 3 && s.points > 0 ? medals[i] : <span style={{ color: "#ccc8c2", fontSize: 12 }}>{i + 1}</span>}
                          </td>
                          <td style={{ padding: "10px 0", fontSize: 13, color: "#1a1714", fontWeight: s.points > 0 ? 600 : 400 }}>{s.name}</td>
                          <td style={{ padding: "10px 0", textAlign: "right", fontSize: 15, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: s.points > 0 ? "#2d6a4f" : "#ccc8c2" }}>{s.points}</td>
                          <td style={{ padding: "10px 0", textAlign: "right", fontSize: 12, color: "#b5b0aa" }}>{s.guesses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ color: "#ccc8c2", fontSize: 10, marginTop: 12, fontStyle: "italic" }}>
                    Closest wins. Bold calls (±2m outside avg) earn 2pts. Children&apos;s sermon: ±1pt.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    { label: "Average", value: fmtLabel(Math.round(avg)), sub: `across ${sermons.length} sermons` },
                    { label: "Most Recent", value: latest ? fmtLabel(latest.durationSeconds) : "—", sub: latest ? fmtDate(latest.date) : "" },
                    { label: "Longest", value: longest ? fmtLabel(longest.durationSeconds) : "—", sub: longest ? fmtDate(longest.date) : "" },
                    { label: "Shortest", value: shortest ? fmtLabel(shortest.durationSeconds) : "—", sub: shortest ? fmtDate(shortest.date) : "" },
                  ].map((stat, i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid #e2ddd8", padding: "16px 20px", borderRadius: i === 0 ? "8px 8px 0 0" : i === 3 ? "0 0 8px 8px" : 0, borderTop: i > 0 ? "none" : "1px solid #e2ddd8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ color: "#b5b0aa", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{stat.label}</div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "#1a1714", lineHeight: 1 }}>{stat.value}</div>
                        <div style={{ color: "#b5b0aa", fontSize: 11, marginTop: 3 }}>{stat.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Chart ─────────────────────────────────────────── */}
            {sermons.length > 0 && (
              <div style={{ ...card, padding: "24px 12px 16px", marginBottom: 24 }}>
                <div style={{ ...sectionLabel, paddingLeft: 8 }}>Duration over time</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="#f0ede9" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fill: "#b5b0aa", fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${Math.floor(v)}m`} tick={{ fill: "#b5b0aa", fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={36} domain={["auto", "auto"]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2ddd8", strokeWidth: 1 }} />
                    <ReferenceLine y={avgMin} stroke="#ccc8c2" strokeDasharray="4 4" label={{ value: "avg", fill: "#b5b0aa", fontSize: 10, position: "right" }} />
                    <Line type="monotone" dataKey="minutes" stroke="#2d6a4f" strokeWidth={2}
                      dot={{ fill: "#fff", stroke: "#2d6a4f", strokeWidth: 2, r: 4 }}
                      activeDot={{ fill: "#2d6a4f", stroke: "#2d6a4f", r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── History table ──────────────────────────────────── */}
            {sermons.length > 0 && (
              <div style={{ ...card, overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 32px", borderBottom: "1px solid #e2ddd8", padding: "10px 20px", minWidth: 280 }}>
                  {["Date", "Duration", ""].map((h, i) => (
                    <span key={i} style={{ color: "#b5b0aa", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                <div style={{ maxHeight: 340, overflowY: "auto" }}>
                  {[...sorted].reverse().map((s, i) => (
                    <div key={s.id}
                      style={{ display: "grid", gridTemplateColumns: "1fr 1fr 32px", padding: "12px 20px", borderBottom: i < sorted.length - 1 ? "1px solid #f0ede9" : "none", alignItems: "center", minWidth: 280 }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f7f5f2")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ color: "#8a837a", fontSize: 13 }}>{fmtDate(s.date)}</span>
                      <span style={{ color: "#2d6a4f", fontSize: 13, fontWeight: 500 }}>{fmtLabel(s.durationSeconds)}</span>
                      <button onClick={() => handleDelete(s.id, s.date)}
                        style={{ background: "none", border: "none", color: "#ccc8c2", fontSize: 18, padding: 0, lineHeight: 1, cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#ccc8c2")}
                        title="Delete">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sermons.length === 0 && !live && (
              <div style={{ paddingTop: 40, textAlign: "center" }}>
                <p style={{ color: "#8a837a", marginBottom: 8 }}>No sermons logged yet.</p>
                <p style={{ color: "#b5b0aa", fontSize: 12 }}>Click &quot;+ Add Sermon&quot; to get started.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
