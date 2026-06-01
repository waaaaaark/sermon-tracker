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

const AVATARS: Record<string, string> = {
  Matt: "/avatars/matt-32.png",
  Marty: "/avatars/marty-32.png",
  Brendan: "/avatars/brendan-32.png",
  Brandon: "/avatars/brandon-32.png",
};

const AVATARS_48: Record<string, string> = {
  Matt: "/avatars/matt-48.png",
  Marty: "/avatars/marty-48.png",
  Brendan: "/avatars/brendan-48.png",
  Brandon: "/avatars/brandon-48.png",
};

function pad(n: number) { return n.toString().padStart(2, "0"); }
function fmtMSS(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
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
  const elapsedMin = Math.floor(elapsedSeconds / 60);
  const elapsedSec = Math.floor(elapsedSeconds % 60);

  const sorted = [...guesses].sort((a, b) => a.guessSeconds - b.guessSeconds);

  const minGuess = Math.min(...sorted.map(g => g.guessSeconds));
  const maxGuess = Math.max(...sorted.map(g => g.guessSeconds));
  const guessSpan = maxGuess - minGuess;
  const guessCenter = (minGuess + maxGuess) / 2;

  // Zoom to the guess cluster so icons are always spread out.
  // Window = guess span + padding on each side, minimum 4 minutes total.
  const PADDING = 90; // 1.5 min breathing room on each side of the cluster
  const MIN_WINDOW = 240; // never zoom in tighter than 4 minutes
  const baseWindow = Math.max(guessSpan + 2 * PADDING, MIN_WINDOW);
  let wStart = guessCenter - baseWindow / 2;
  let wEnd = guessCenter + baseWindow / 2;

  // Expand to keep needle visible
  if (elapsedSeconds > wEnd) wEnd = elapsedSeconds + PADDING;
  if (elapsedSeconds < wStart) wStart = elapsedSeconds - PADDING;

  const windowStart = Math.max(0, wStart);
  const windowEnd = wEnd;
  const windowSize = windowEnd - windowStart;

  function toWindowPct(sec: number): number {
    return ((sec - windowStart) / windowSize) * 100;
  }

  const needlePct = toWindowPct(elapsedSeconds);

  // Who's currently winning
  const currentLeader = sorted.reduce((best, g) => {
    return Math.abs(g.guessSeconds - elapsedSeconds) < Math.abs(best.guessSeconds - elapsedSeconds) ? g : best;
  });
  const leaderColor = COLORS[sorted.findIndex(g => g.name === currentLeader.name) % COLORS.length];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Clock + live badge */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800, color: "#1a1714", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {pad(elapsedMin)}:{pad(elapsedSec)}
        </span>
        <span style={{ color: "#b5b0aa", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>elapsed</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#c0392b", display: "inline-block", animation: "pulse 1.2s infinite" }} />
          <span style={{ fontSize: 11, color: "#8a837a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Live</span>
        </span>
      </div>

      {/* Timeline */}
      <div style={{ position: "relative", overflow: "hidden", padding: "40px 0 56px" }}>
        {/* Track bar */}
        <div style={{ position: "relative", height: 6, background: "#f0ede9", borderRadius: 3 }}>

          {/* Guess pins */}
          {sorted.map((g, i) => {
            const pct = toWindowPct(g.guessSeconds);
            const isLeader = g.name === currentLeader.name;
            const isPast = elapsedSeconds > g.guessSeconds + 15;
            const color = COLORS[i % COLORS.length];
            const diff = Math.abs(g.guessSeconds - elapsedSeconds);
            const avatarSrc = AVATARS[g.name];
            const pinSize = isLeader ? 38 : 32;
            const labelBottom = isLeader ? 52 : 44;

            return (
              <div key={g.name} style={{ position: "absolute", left: `${pct}%`, top: "50%", transform: "translate(-50%, -50%)", zIndex: 3 }}>
                {/* Label above */}
                <div style={{ position: "absolute", bottom: labelBottom, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: isLeader ? 700 : 500, color: isPast ? "#ccc8c2" : color, marginBottom: 1 }}>{g.name}</div>
                  <div style={{ fontSize: 10, color: "#b5b0aa" }}>{fmtMSS(g.guessSeconds)}</div>
                  {isLeader && !isPast && (
                    <div style={{ fontSize: 9, color: color, marginTop: 1 }}>±{Math.round(diff)}s</div>
                  )}
                </div>
                {/* Avatar or initial fallback */}
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={g.name}
                    width={pinSize}
                    height={pinSize}
                    style={{
                      borderRadius: "50%",
                      border: `2px solid ${isPast ? "#ccc8c2" : color}`,
                      boxShadow: isLeader && !isPast ? `0 0 0 4px ${color}30` : "none",
                      opacity: isPast ? 0.45 : 1,
                      display: "block",
                      position: "relative",
                      zIndex: 4,
                      imageRendering: "pixelated",
                      transition: "all 0.2s",
                    }}
                  />
                ) : (
                  <div style={{
                    width: pinSize, height: pinSize, borderRadius: "50%",
                    background: isPast ? "#e2ddd8" : color,
                    border: `2px solid ${isPast ? "#ccc8c2" : color}`,
                    boxShadow: isLeader && !isPast ? `0 0 0 4px ${color}30` : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    position: "relative", zIndex: 4,
                    opacity: isPast ? 0.45 : 1,
                    transition: "all 0.2s",
                  }}>
                    {g.name[0]}
                  </div>
                )}
              </div>
            );
          })}

          {/* Elapsed needle */}
          <div style={{
              position: "absolute",
              left: `${Math.max(0, Math.min(100, needlePct))}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 5,
              display: "flex", flexDirection: "column", alignItems: "center",
              transition: "left 0.15s linear",
            }}>
              {/* Label below needle */}
              <div style={{ position: "absolute", top: 18, background: "#1a1714", color: "#fff", fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 600, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>
                {pad(elapsedMin)}:{pad(elapsedSec)}
              </div>
              {/* Triangle top */}
              <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "6px solid #1a1714", marginBottom: 0 }} />
              {/* Line */}
              <div style={{ width: 2, height: 24, background: "#1a1714", borderRadius: 1 }} />
            </div>
        </div>

        {/* Axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 10, color: "#ccc8c2", fontFamily: "'DM Mono', monospace" }}>{fmtMSS(windowStart)}</span>
          <span style={{ fontSize: 10, color: "#ccc8c2", fontFamily: "'DM Mono', monospace" }}>{fmtMSS((windowStart + windowEnd) / 2)}</span>
          <span style={{ fontSize: 10, color: "#ccc8c2", fontFamily: "'DM Mono', monospace" }}>{fmtMSS(windowEnd)}</span>
        </div>
      </div>

      {/* Who's winning */}
      <div style={{ background: "#f7f5f2", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        {AVATARS_48[currentLeader.name] ? (
          <img src={AVATARS_48[currentLeader.name]} alt={currentLeader.name} width={48} height={48}
            style={{ borderRadius: "50%", imageRendering: "pixelated", flexShrink: 0, border: `2px solid ${leaderColor}` }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: leaderColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
            {currentLeader.name[0]}
          </div>
        )}
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1714" }}>{currentLeader.name} </span>
          <span style={{ fontSize: 13, color: "#8a837a" }}>
            is closest — guessed {fmtMSS(currentLeader.guessSeconds)},{" "}
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
