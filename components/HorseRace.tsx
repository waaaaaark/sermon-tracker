"use client";

import { useEffect, useState, useRef } from "react";

interface Guess {
  name: string;
  guessSeconds: number;
}

interface Props {
  startedAt: number; // unix ms
  guesses: Guess[];
}

const HORSES = ["🐴", "🏇", "🦄", "🐎", "🐖"];
const COLORS = ["#2d6a4f", "#c0392b", "#8e44ad", "#d4861a", "#2980b9"];

function pad(n: number) { return n.toString().padStart(2, "0"); }

export default function HorseRace({ startedAt, guesses }: Props) {
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

  // Track width in seconds — show at least the furthest guess + 10% buffer
  const maxGuess = Math.max(...guesses.map(g => g.guessSeconds), 60);
  const trackMax = Math.max(maxGuess * 1.15, elapsedSeconds * 1.1, 120);

  // Sort guesses by time (shortest first = bottom of leaderboard right now)
  const sorted = [...guesses].sort((a, b) => a.guessSeconds - b.guessSeconds);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Elapsed clock */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "baseline" }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 42, fontWeight: 800, color: "#1a1714", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {pad(minutes)}:{pad(seconds)}
        </span>
        <span style={{ color: "#b5b0aa", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>elapsed</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#c0392b", display: "inline-block", animation: "pulse 1.2s infinite" }} />
          <span style={{ fontSize: 11, color: "#8a837a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Live</span>
        </span>
      </div>

      {/* Race tracks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map((guess, i) => {
          const horseProgress = Math.min(elapsedSeconds / trackMax, 1);
          const finishLinePos = guess.guessSeconds / trackMax;
          const isEliminated = elapsedSeconds > guess.guessSeconds;
          const horseEmoji = HORSES[i % HORSES.length];
          const color = COLORS[i % COLORS.length];

          return (
            <div key={guess.name}>
              {/* Name + guess */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isEliminated ? "#ccc8c2" : "#1a1714" }}>
                  {guess.name}
                  {isEliminated && <span style={{ marginLeft: 6, fontSize: 10, color: "#c0392b" }}>eliminated</span>}
                </span>
                <span style={{ fontSize: 11, color: "#b5b0aa" }}>
                  guessed {Math.floor(guess.guessSeconds / 60)}m {guess.guessSeconds % 60 > 0 ? (guess.guessSeconds % 60) + "s" : ""}
                </span>
              </div>

              {/* Track */}
              <div style={{ position: "relative", height: 40, background: isEliminated ? "#fafafa" : "#f0ede9", borderRadius: 8, overflow: "hidden", border: `1px solid ${isEliminated ? "#e8e8e8" : "#e2ddd8"}` }}>

                {/* Finish line (guess position) */}
                <div style={{
                  position: "absolute",
                  left: `${finishLinePos * 100}%`,
                  top: 0, bottom: 0,
                  width: 2,
                  background: isEliminated ? "#e2ddd8" : color,
                  opacity: isEliminated ? 0.4 : 0.6,
                  zIndex: 2,
                }} />
                {/* Finish line flag */}
                <div style={{
                  position: "absolute",
                  left: `calc(${finishLinePos * 100}% + 3px)`,
                  top: 4,
                  fontSize: 10,
                  color: isEliminated ? "#ccc8c2" : color,
                  opacity: isEliminated ? 0.5 : 1,
                  zIndex: 3,
                  whiteSpace: "nowrap",
                }}>🏁</div>

                {/* Progress fill */}
                <div style={{
                  position: "absolute",
                  left: 0, top: 0, bottom: 0,
                  width: `${horseProgress * 100}%`,
                  background: isEliminated
                    ? "linear-gradient(90deg, #f0f0f0, #e8e8e8)"
                    : `linear-gradient(90deg, ${color}22, ${color}44)`,
                  transition: "width 0.1s linear",
                  zIndex: 1,
                }} />

                {/* Horse emoji */}
                <div style={{
                  position: "absolute",
                  left: `calc(${Math.min(horseProgress, finishLinePos / 1) * 100}% - 20px)`,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 22,
                  zIndex: 4,
                  filter: isEliminated ? "grayscale(100%) opacity(0.4)" : "none",
                  transition: "left 0.1s linear",
                }}>
                  {horseEmoji}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, fontSize: 11, color: "#b5b0aa", fontStyle: "italic" }}>
        🏁 = each person&apos;s guess · horse stops at their guess · eliminated if sermon passes their guess
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}
