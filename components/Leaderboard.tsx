"use client";

import { LeaderboardEntry } from "@/lib/store";
import { formatDuration } from "@/lib/utils";

interface Props {
  entries: LeaderboardEntry[];
}

const medals = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="leaderboard-empty">
        <span>No scored guesses yet. Be the first!</span>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      {entries.map((entry, i) => (
        <div key={entry.name} className={`lb-row ${i < 3 ? "lb-top" : ""}`}>
          <div className="lb-rank">
            {i < 3 ? (
              <span className="lb-medal">{medals[i]}</span>
            ) : (
              <span className="lb-num">{i + 1}</span>
            )}
          </div>
          <div className="lb-info">
            <span className="lb-name">{entry.name}</span>
            <span className="lb-guesses">{entry.totalGuesses} guess{entry.totalGuesses !== 1 ? "es" : ""}</span>
          </div>
          <div className="lb-stats">
            <div className="lb-stat">
              <span className="stat-val">±{formatDuration(Math.round(entry.recentScore))}</span>
              <span className="stat-label">recent avg</span>
            </div>
            <div className="lb-stat">
              <span className="stat-val">±{formatDuration(Math.round(entry.bestDiffSeconds))}</span>
              <span className="stat-label">best</span>
            </div>
          </div>
        </div>
      ))}
      <p className="lb-note">Ranked by average accuracy of last 4 scored guesses (lower = better)</p>
    </div>
  );
}
