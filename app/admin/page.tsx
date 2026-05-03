"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate, formatDuration } from "@/lib/utils";
import { Sermon } from "@/lib/store";

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [date, setDate] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSermons = useCallback(async () => {
    const res = await fetch("/api/sermons");
    const data = await res.json();
    setSermons([...data].sort((a: Sermon, b: Sermon) => b.date.localeCompare(a.date)));
  }, []);

  useEffect(() => {
    if (authed) fetchSermons();
  }, [authed, fetchSermons]);

  async function handleAuth() {
    // Test the key by making an admin request
    const res = await fetch("/api/admin/sermon", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": key,
      },
      body: JSON.stringify({ id: "__test__" }),
    });
    if (res.status === 401) {
      setAuthError("Wrong admin key.");
    } else {
      setAuthed(true);
      setAuthError("");
    }
  }

  async function handleAdd() {
    if (!date) { setStatus("Please select a date."); return; }
    setLoading(true);
    setStatus("");
    const res = await fetch("/api/admin/sermon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": key,
      },
      body: JSON.stringify({ date, minutes, seconds, title, speaker }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus("✅ Saved successfully!");
      setDate("");
      setTitle("");
      setSpeaker("");
      fetchSermons();
    } else {
      setStatus(`❌ ${data.error}`);
    }
    setLoading(false);
  }

  async function handleDelete(id: string, dateStr: string) {
    if (!confirm(`Delete sermon from ${formatDate(dateStr)}?`)) return;
    await fetch("/api/admin/sermon", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ id }),
    });
    fetchSermons();
  }

  if (!authed) {
    return (
      <main className="page">
        <div className="admin-auth">
          <div className="header-cross">✝</div>
          <h1>Admin Login</h1>
          <input
            type="password"
            placeholder="Enter admin key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          />
          {authError && <p className="error-msg">{authError}</p>}
          <button className="btn-primary" onClick={handleAuth}>Enter</button>
          <a href="/" className="admin-back">← Back to site</a>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="site-header">
        <div className="header-cross">✝</div>
        <div className="header-text">
          <h1>Admin Panel</h1>
          <p className="header-sub">Enter Sunday sermon data</p>
        </div>
      </header>

      <div className="content">
        <section className="card">
          <h2 className="section-title">
            <span className="section-icon">➕</span>
            Add / Update Sermon
          </h2>

          <div className="admin-form">
            <div className="field">
              <label>Sunday Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Duration</label>
              <div className="time-inputs">
                <div className="time-group">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={minutes}
                    onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                  />
                  <span>min</span>
                </div>
                <div className="time-group">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={seconds}
                    onChange={(e) => setSeconds(parseInt(e.target.value) || 0)}
                  />
                  <span>sec</span>
                </div>
              </div>
            </div>

            <div className="field">
              <label>Title (optional)</label>
              <input
                type="text"
                placeholder="Sermon title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Speaker (optional)</label>
              <input
                type="text"
                placeholder="Speaker name"
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
              />
            </div>

            {status && <p className="status-msg">{status}</p>}

            <button className="btn-primary" onClick={handleAdd} disabled={loading}>
              {loading ? "Saving…" : "Save Sermon"}
            </button>
          </div>
        </section>

        <section className="card">
          <h2 className="section-title">
            <span className="section-icon">📋</span>
            Existing Records
          </h2>
          <div className="sermon-list">
            {sermons.length === 0 && <p className="muted">No sermons yet.</p>}
            {sermons.map((s) => (
              <div key={s.id} className="sermon-row">
                <div className="sermon-meta">
                  <span className="sermon-date">{formatDate(s.date)}</span>
                  {s.title && <span className="sermon-title">{s.title}</span>}
                  {s.speaker && <span className="sermon-speaker">— {s.speaker}</span>}
                </div>
                <div className="sermon-right">
                  <span className="sermon-duration">{formatDuration(s.durationSeconds)}</span>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(s.id, s.date)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ textAlign: "center" }}>
          <a href="/" className="admin-back">← Back to site</a>
        </div>
      </div>
    </main>
  );
}
