"use client";

import { Sermon, Guess } from "@/lib/store";
import { formatDate, formatDuration } from "@/lib/utils";

interface Props {
  sermons: Sermon[];
  guesses: Guess[];
}

export default function SermonList({ sermons, guesses }: Props) {
  const sorted = [...sermons].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="sermon-list">
      {sorted.map((sermon) => {
        const sermonGuesses = guesses.filter((g) => g.sermonDate === sermon.date);
        const closestGuess =
          sermonGuesses.length > 0
            ? sermonGuesses.reduce((best, g) => {
                const diff = Math.abs(g.guessSeconds - sermon.durationSeconds);
                const bestDiff = Math.abs(best.guessSeconds - sermon.durationSeconds);
                return diff < bestDiff ? g : best;
              })
            : null;

        return (
          <div key={sermon.id} className="sermon-row">
            <div className="sermon-meta">
              <span className="sermon-date">{formatDate(sermon.date)}</span>
              {sermon.title && <span className="sermon-title">{sermon.title}</span>}
              {sermon.speaker && <span className="sermon-speaker">— {sermon.speaker}</span>}
            </div>
            <div className="sermon-right">
              <span className="sermon-duration">{formatDuration(sermon.durationSeconds)}</span>
              {closestGuess && (
                <span className="sermon-winner">
                  🎯 {closestGuess.name} (±{formatDuration(Math.abs(closestGuess.guessSeconds - sermon.durationSeconds))})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
