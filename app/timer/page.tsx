"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type Phase = "idle" | "running" | "stopped" | "saved";

const STORAGE_KEY = "sermon_timer_start";

function pad(n: number) { return n.toString().padStart(2, "0"); }

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return { hours, minutes, seconds, centiseconds, totalSeconds };
}

function getThisSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // rewind to Sunday
  // Use local date parts, not UTC
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDateNice(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

export default function TimerPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [saveDate, setSaveDate] = useState(getThisSunday());
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const finalMs = useRef<number>(0);

  const tick = useCallback(() => {
    if (startRef.current !== null) {
      setElapsed(Date.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const startedAt = parseInt(stored, 10);
      if (!isNaN(startedAt)) {
        startRef.current = startedAt;
        setPhase("running");
        rafRef.current = requestAnimationFrame(tick);
      }
    }
  }, [tick]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  async function handleStart() {
    const now = Date.now();
    startRef.current = now;
    localStorage.setItem(STORAGE_KEY, now.toString());
    setElapsed(0);
    setPhase("running");
    rafRef.current = requestAnimationFrame(tick);
    await fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startedAt: now, date: getThisSunday() }),
    });
  }

  function handleStop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    finalMs.current = elapsed;
    setPhase("stopped");
  }

  function handleResume() {
    startRef.current = Date.now() - finalMs.current;
    if (startRef.current) localStorage.setItem(STORAGE_KEY, startRef.current.toString());
    setPhase("running");
    rafRef.current = requestAnimationFrame(tick);
  }

  async function handleReset() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
    setElapsed(0);
    finalMs.current = 0;
    setPhase("idle");
    setSaveErr("");
    await fetch("/api/live", { method: "DELETE" });
  }

  async function handleSave() {
    setSaving(true);
    setSaveErr("");
    const { minutes, seconds } = formatElapsed(finalMs.current);
    const res = await fetch("/api/sermons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: saveDate, minutes, seconds }),
    });
    if (res.ok) {
      localStorage.removeItem(STORAGE_KEY);
      await fetch("/api/live", { method: "DELETE" });
      setPhase("saved");
    } else {
      const d = await res.json();
      setSaveErr(d.error || "Failed to save.");
    }
    setSaving(false);
  }

  const displayMs = phase === "stopped" || phase === "saved" ? finalMs.current : elapsed;
  const { hours, minutes, seconds, centiseconds } = formatElapsed(displayMs);
  const isRunning = phase === "running";
  const isStopped = phase === "stopped";
  const isIdle = phase === "idle";
  const isSaved = phase === "saved";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f7f5f2" }}>
      <header style={{ borderBottom: "1px solid #e2ddd8", background: "#fff", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ color: "#b5b0aa", fontSize: 12, textDecoration: "none" }}>← Back</Link>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#1a1714" }}>Sermon Timer</span>
        <div style={{ width: 48 }} />
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        {isSaved ? (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 56 }}>✅</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#1a1714", lineHeight: 1 }}>Saved!</div>
              <div style={{ color: "#8a837a", fontSize: 14, marginTop: 8 }}>
                {pad(minutes)}:{pad(seconds)} logged for {fmtDateNice(saveDate)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={handleReset} style={btnSecondary}>Time another</button>
              <Link href="/" style={{ ...btnPrimary, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>View dashboard</Link>
            </div>
          </div>
        ) : (
          <>
            {isRunning && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, background: "#fff", border: "1px solid #e2ddd8", borderRadius: 100, padding: "6px 16px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#c0392b", display: "inline-block", animation: "pulse 1.2s infinite" }} />
                <span style={{ fontSize: 11, color: "#8a837a", letterSpacing: "0.08em", textTransform: "uppercase" }}>Live — front page is showing race</span>
              </div>
            )}

            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "#1a1714", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 16, textAlign: "center", userSelect: "none" }}>
              {hours > 0 && <div style={{ fontSize: "clamp(48px, 18vw, 96px)", opacity: 0.4 }}>{pad(hours)}</div>}
              <div style={{ fontSize: "clamp(72px, 26vw, 148px)", display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "0.05em" }}>
                <span>{pad(minutes)}</span>
                <span style={{ opacity: isRunning ? 1 : 0.3, transition: "opacity 0.15s" }}>:</span>
                <span>{pad(seconds)}</span>
              </div>
              <div style={{ fontSize: "clamp(28px, 10vw, 56px)", color: "#b5b0aa", marginTop: -4 }}>.{pad(centiseconds)}</div>
            </div>

            <div style={{ color: "#b5b0aa", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 48, height: 16 }}>
              {isIdle ? "ready" : isRunning ? "recording" : "paused"}
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {isIdle && <button onClick={handleStart} style={btnBig("#2d6a4f", "#fff")}>Start</button>}
              {isRunning && <>
                <button onClick={handleReset} style={btnBig("#f0ede9", "#8a837a")}>Reset</button>
                <button onClick={handleStop} style={btnBig("#c0392b", "#fff")}>Stop</button>
              </>}
              {isStopped && <>
                <button onClick={handleReset} style={btnBig("#f0ede9", "#8a837a")}>Reset</button>
                <button onClick={handleResume} style={btnBig("#f0ede9", "#1a1714")}>Resume</button>
              </>}
            </div>

            {isStopped && (
              <div style={{ marginTop: 48, background: "#fff", border: "1px solid #e2ddd8", borderRadius: 12, padding: "24px", width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ color: "#b5b0aa", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Save this sermon</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ color: "#8a837a", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>Date</label>
                  <input type="date" value={saveDate} onChange={e => setSaveDate(e.target.value)}
                    style={{ background: "#f7f5f2", border: "1px solid #e2ddd8", borderRadius: 6, color: "#1a1714", padding: "8px 12px", fontSize: 14, outline: "none", fontFamily: "'DM Mono', monospace", width: "100%" }} />
                  <div style={{ color: "#b5b0aa", fontSize: 11 }}>{fmtDateNice(saveDate)}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ color: "#8a837a", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>Duration</label>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 700, color: "#2d6a4f" }}>{pad(minutes)}:{pad(seconds)}</div>
                </div>
                {saveErr && <p style={{ color: "#c0392b", fontSize: 12 }}>{saveErr}</p>}
                <button onClick={handleSave} disabled={saving}
                  style={{ background: "#2d6a4f", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono', monospace", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving…" : "Save Sermon"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

function btnBig(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: "none", borderRadius: 100, padding: "18px 36px", fontSize: 17, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", minWidth: 120 };
}
const btnPrimary: React.CSSProperties = { background: "#2d6a4f", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono', monospace", cursor: "pointer" };
const btnSecondary: React.CSSProperties = { background: "#f0ede9", color: "#1a1714", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 500, fontFamily: "'DM Mono', monospace", cursor: "pointer" };