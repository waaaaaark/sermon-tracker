"use client";

import { useState } from "react";
import Link from "next/link";

const NAMES = ["Matt", "Marty", "Brendan", "Brandon", "Dave", "Guest"];

function pad(n: number) { return n.toString().padStart(2, "0"); }
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2ddd8", borderRadius: 8, padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#b5b0aa", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function Btn({ onClick, color = "#2d6a4f", children }: { onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: color, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginRight: 8, marginTop: 8 }}>
      {children}
    </button>
  );
}

export default function TestPage() {
  const [log, setLog] = useState<string[]>([]);
  const [date, setDate] = useState(todayLocal());
  const [liveMinutes, setLiveMinutes] = useState(10);
  const [guessName, setGuessName] = useState("Matt");
  const [guessMin, setGuessMin] = useState(25);
  const [sermonMin, setSermonMin] = useState(28);
  const [sermonSec, setSermonSec] = useState(0);

  function addLog(msg: string, ok = true) {
    setLog(l => [`${ok ? "✅" : "❌"} ${new Date().toLocaleTimeString()} — ${msg}`, ...l].slice(0, 30));
  }

  async function go(label: string, fn: () => Promise<Response>) {
    try {
      const res = await fn();
      const data = await res.json();
      addLog(`${label}: ${JSON.stringify(data)}`, res.ok);
    } catch (e) {
      addLog(`${label}: ${e}`, false);
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function startLive() {
    const startedAt = Date.now() - liveMinutes * 60 * 1000;
    await go(`Start live (${liveMinutes}m ago) for ${date}`, () =>
      fetch("/api/live", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startedAt, date }) })
    );
  }

  async function clearLive() {
    await go("Clear live flag", () => fetch("/api/live", { method: "DELETE" }));
  }

  async function submitGuess() {
    await go(`Guess ${guessMin}m for ${guessName} on ${date}`, () =>
      fetch("/api/guesses-test", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, name: guessName, guessSeconds: guessMin * 60 }) })
    );
  }

  async function submitAllGuesses() {
    const guesses = [
      { name: "Matt", min: 22 }, { name: "Marty", min: 25 },
      { name: "Brendan", min: 28 }, { name: "Brandon", min: 30 }, { name: "Dave", min: 20 },
    ];
    for (const g of guesses) {
      await go(`Guess ${g.min}m for ${g.name}`, () =>
        fetch("/api/guesses-test", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, name: g.name, guessSeconds: g.min * 60 }) })
      );
    }
  }

  async function saveSermon() {
    await go(`Save sermon ${sermonMin}m ${sermonSec}s on ${date}`, () =>
      fetch("/api/sermons", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, minutes: sermonMin, seconds: sermonSec }) })
    );
  }

  async function fetchGuesses() {
    await go(`Fetch guesses for ${date}`, () => fetch(`/api/guesses?date=${date}`));
  }

  async function fetchLive() {
    await go("Fetch live flag", () => fetch("/api/live"));
  }

  async function fetchResolution() {
    await go("Fetch resolution", () => fetch("/api/resolution"));
  }

  async function fetchLeaderboard() {
    await go("Fetch leaderboard", () => fetch("/api/leaderboard"));
  }

  async function deleteGuesses() {
    await go(`Delete all guesses for ${date}`, () =>
      fetch("/api/guesses-test", { method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }) })
    );
  }

  const inputS: React.CSSProperties = {
    background: "#f7f5f2", border: "1px solid #e2ddd8", borderRadius: 6,
    color: "#1a1714", padding: "6px 10px", fontSize: 13, outline: "none",
    fontFamily: "'DM Mono', monospace",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f5f2", fontFamily: "'DM Mono', monospace" }}>
      <header style={{ borderBottom: "1px solid #e2ddd8", background: "#fff", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ color: "#b5b0aa", fontSize: 12, textDecoration: "none" }}>← Back</Link>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Test Panel</span>
        <div style={{ width: 48 }} />
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 64px" }}>

        <Section title="Working date">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputS} />
            <span style={{ color: "#8a837a", fontSize: 12 }}>all actions below use this date</span>
          </div>
        </Section>

        <Section title="Live timer">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "#8a837a" }}>Pretend started</label>
            <input type="number" min={0} max={120} value={liveMinutes}
              onChange={e => setLiveMinutes(parseInt(e.target.value) || 0)}
              style={{ ...inputS, width: 64 }} />
            <label style={{ fontSize: 12, color: "#8a837a" }}>minutes ago</label>
          </div>
          <div>
            <Btn onClick={startLive}>▶ Start live</Btn>
            <Btn onClick={clearLive} color="#c0392b">✕ Clear live</Btn>
            <Btn onClick={fetchLive} color="#8a837a">? Fetch live</Btn>
          </div>
        </Section>

        <Section title="Guesses">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={guessName} onChange={e => setGuessName(e.target.value)} style={inputS}>
              {NAMES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <input type="number" min={1} max={60} value={guessMin}
              onChange={e => setGuessMin(parseInt(e.target.value) || 0)}
              style={{ ...inputS, width: 64 }} />
            <span style={{ fontSize: 12, color: "#8a837a" }}>minutes</span>
          </div>
          <div>
            <Btn onClick={submitGuess}>Submit guess</Btn>
            <Btn onClick={submitAllGuesses} color="#8e44ad">Submit all 5 (22/25/28/30/20m)</Btn>
            <Btn onClick={fetchGuesses} color="#8a837a">? Fetch guesses</Btn>
            <Btn onClick={deleteGuesses} color="#c0392b">✕ Delete all guesses</Btn>
          </div>
        </Section>

        <Section title="Save sermon (triggers scoring)">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="number" min={1} max={120} value={sermonMin}
              onChange={e => setSermonMin(parseInt(e.target.value) || 0)}
              style={{ ...inputS, width: 64 }} />
            <span style={{ fontSize: 12, color: "#8a837a" }}>m</span>
            <input type="number" min={0} max={59} value={sermonSec}
              onChange={e => setSermonSec(parseInt(e.target.value) || 0)}
              style={{ ...inputS, width: 64 }} />
            <span style={{ fontSize: 12, color: "#8a837a" }}>s</span>
          </div>
          <div>
            <Btn onClick={saveSermon}>💾 Save sermon</Btn>
          </div>
        </Section>

        <Section title="Fetch state">
          <Btn onClick={fetchResolution} color="#8a837a">? Resolution</Btn>
          <Btn onClick={fetchLeaderboard} color="#8a837a">? Leaderboard</Btn>
        </Section>

        {/* Log */}
        <Section title="Log">
          {log.length === 0 ? (
            <p style={{ color: "#b5b0aa", fontSize: 12 }}>No actions yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {log.map((l, i) => (
                <div key={i} style={{ fontSize: 11, color: "#1a1714", background: "#f7f5f2", padding: "6px 10px", borderRadius: 4, wordBreak: "break-all" }}>{l}</div>
              ))}
            </div>
          )}
        </Section>
      </main>
    </div>
  );
}