"use client";

import { useEffect, useState, useRef } from "react";

interface Guess {
  name: string;
  guessSeconds: number;
}

interface Props {
  startedAt: number;
  guesses: Guess[];
}

const COLORS = ["#2d6a4f", "#c0392b", "#8e44ad", "#d4861a", "#2980b9"];

function pad(n: number) { return n.toString().padStart(2, "0"); }
function fmtLabel(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${pad(sec)}`;
}

export default function SermonRace({ startedAt, guesses }: Props) {
  const [nowMs, setNowMs] = useState(Date.now() - startedAt);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function tick() {
      setNowMs(Date.now() - startedAt);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startedAt]);

  const elapsedSeconds = nowMs / 1000;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);

  // Track range: 0 to furthest guess + 20% buffer, minimum 40 minutes
  const maxGuess = Math.max(...guesses.map(g => g.guessSeconds));
  const trackMax = Math.max(maxGuess * 1.2, 2400); // at least 40 min
  const elapsedClamped = Math.min(elapsedSeconds, trackMax);

  // Sort guesses for consistent color assignment
  const sorted = [...guesses].sort((a, b) => a.guessSeconds - b.guessSeconds);

  // Find who's currently winning (closest to elapsed)
  const currentLeader = sorted.reduce((best, g) => {
    const diff = Math.abs(g.guessSeconds - elapsedSeconds);
    const bestDiff = Math.abs(best.guessSeconds - elapsedSeconds);
    return diff < bestDiff ? g : best;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Elapsed clock */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 42, fontWeight: 800, color: "#1a1714", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {pad(minutes)}:{pad(seconds)}
        </span>
        <span style={{ color: "#b5b0aa", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>elapsed</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#c0392b", display: "inline-block", animation: "pulse 1.2s infinite" }} />
          <span style={{ fontSize: 11, color: "#8a837a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Live</span>
        </span>
      </div>

      {/* Number line */}
      <div style={{ position: "relative", paddingBottom: 48 }}>

        {/* Track */}
        <div style={{ position: "relative", height: 6, background: "#f0ede9", borderRadius: 3, margin: "32px 0 0" }}>

          {/* Elapsed fill */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${(elapsedClamped / trackMax) * 100}%`,
            background: "linear-gradient(90deg, #e2ddd8, #ccc8c2)",
            borderRadius: 3,
            transition: "width 0.1s linear",
          }} />

          {/* Guess pins */}
          {sorted.map((g, i) => {
            const pct = (g.guessSeconds / trackMax) * 100;
            const diff = Math.abs(g.guessSeconds - elapsedSeconds);
            const isLeading = g.name === currentLeader.name;
            const isPassed = elapsedSeconds > g.guessSeconds + 30; // 30s grace
            const color = COLORS[i % COLORS.length];

            return (
              <div key={g.name} style={{ position: "absolute", left: `${pct}%`, top: "50%", transform: "translate(-50%, -50%)", zIndex: 3 }}>
                {/* Vertical line down to label */}
                <div style={{
                  position: "absolute",
                  left: "50%", top: 3,
                  width: 1.5,
                  height: 24,
                  background: isPassed ? "#ccc8c2" : color,
                  transform: "translateX(-50%)",
                  opacity: isPassed ? 0.4 : 1,
                }} />
                {/* Pin dot */}
                <div style={{
                  width: isLeading ? 16 : 12,
                  height: isLeading ? 16 : 12,
                  borderRadius: "50%",
                  background: isPassed ? "#e2ddd8" : color,
                  border: `2px solid ${isPassed ? "#ccc8c2" : color}`,
                  boxShadow: isLeading ? `0 0 0 3px ${color}33` : "none",
                  transition: "all 0.2s",
                  position: "relative", zIndex: 4,
                }} />
                {/* Label below */}
                <div style={{
                  position: "absolute",
                  top: 28,
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 11, fontWeight: isLeading ? 700 : 500, color: isPassed ? "#ccc8c2" : color }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: 10, color: "#b5b0aa", marginTop: 1 }}>{fmtLabel(g.guessSeconds)}</div>
                  {isLeading && !isPassed && (
                    <div style={{ fontSize: 9, color: color, marginTop: 1, letterSpacing: "0.04em" }}>
                      ±{Math.round(diff)}s
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Elapsed time needle */}
          <div style={{
            position: "absolute",
            left: `${(elapsedClamped / trackMax) * 100}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            {/* Time label above needle */}
            <div style={{
              position: "absolute",
              bottom: 14,
              background: "#1a1714",
              color: "#fff",
              fontSize: 10,
              fontFamily: "'DM Mono', monospace",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}>
              {pad(minutes)}:{pad(seconds)}
            </div>
            {/* Needle line */}
            <div style={{
              width: 2,
              height: 28,
              background: "#1a1714",
              borderRadius: 1,
            }} />
            {/* Triangle pointer */}
            <div style={{
              width: 0, height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "6px solid #1a1714",
            }} />
          </div>
        </div>

        {/* Time axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 64, paddingTop: 4 }}>
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const s = Math.round(pct * trackMax);
            return (
              <span key={pct} style={{ fontSize: 10, color: "#ccc8c2", fontFamily: "'DM Mono', monospace" }}>
                {Math.floor(s / 60)}m
              </span>
            );
          })}
        </div>
      </div>

      {/* Who's winning callout */}
      <div style={{ background: "#f7f5f2", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>🎯</span>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1714" }}>{currentLeader.name} </span>
          <span style={{ fontSize: 13, color: "#8a837a" }}>
            is closest — guessed {fmtLabel(currentLeader.guessSeconds)}, currently{" "}
            {elapsedSeconds < currentLeader.guessSeconds
              ? `${Math.round(currentLeader.guessSeconds - elapsedSeconds)}s away`
              : `${Math.round(elapsedSeconds - currentLeader.guessSeconds)}s past`}
          </span>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}