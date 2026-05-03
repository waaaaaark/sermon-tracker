"use client";

import { useState } from "react";
import { getNextSunday, formatDate } from "@/lib/utils";

interface Props {
  availableDates: string[]; // Sundays without results yet (for guessing)
  onSuccess: () => void;
}

export default function GuessForm({ availableDates, onSuccess }: Props) {
  const nextSunday = getNextSunday();
  // Use first available date or next sunday
  const defaultDate =
    availableDates.length > 0 ? availableDates[0] : nextSunday;

  const [name, setName] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/guesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sermonDate: date, name, minutes, seconds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
      } else {
        setStatus("success");
        onSuccess();
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="guess-success">
        <div className="success-icon">🎯</div>
        <h3>Guess recorded!</h3>
        <p>
          You guessed <strong>{minutes}m {seconds.toString().padStart(2, "0")}s</strong> for{" "}
          <strong>{formatDate(date)}</strong>.
        </p>
        <p className="success-sub">Check back after the service to see how you did.</p>
        <button
          className="btn-secondary"
          onClick={() => {
            setStatus("idle");
            setName("");
          }}
        >
          Submit another guess
        </button>
      </div>
    );
  }

  return (
    <div className="guess-form">
      <div className="field">
        <label>Your name</label>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      <div className="field">
        <label>Sunday</label>
        <select value={date} onChange={(e) => setDate(e.target.value)}>
          {availableDates.length > 0 ? (
            availableDates.map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))
          ) : (
            <option value={nextSunday}>{formatDate(nextSunday)}</option>
          )}
        </select>
        <span className="field-hint">You can only guess on upcoming Sundays</span>
      </div>

      <div className="field">
        <label>Your guess</label>
        <div className="time-inputs">
          <div className="time-group">
            <input
              type="number"
              min={1}
              max={120}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
            />
            <span>min</span>
          </div>
          <div className="time-group">
            <input
              type="number"
              min={0}
              max={59}
              value={seconds}
              onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            />
            <span>sec</span>
          </div>
        </div>
      </div>

      {errorMsg && <p className="error-msg">{errorMsg}</p>}

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={status === "loading"}
      >
        {status === "loading" ? "Submitting…" : "Submit Guess"}
      </button>
    </div>
  );
}
