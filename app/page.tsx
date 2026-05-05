"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from "recharts";

interface Sermon {
  id: string;
  date: string;
  durationSeconds: number;
  speaker?: string;
  title?: string;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtLabel(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec > 0 ? sec + "s" : ""}`.trim();
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}

function fmtShort(d: string) {
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const s: Sermon = payload[0].payload;
  return (
    <div style={{
      background: "#1e1e21", border: "1px solid #3a3a3e",
      borderRadius: 6, padding: "10px 14px", fontSize: 13,
    }}>
      <div style={{ color: "#6b6b72", marginBottom: 4, fontSize: 11 }}>{fmtDate(s.date)}</div>
      {s.title && <div style={{ color: "#e8e8ea", marginBottom: 2 }}>{s.title}</div>}
      {s.speaker && <div style={{ color: "#6b6b72", fontSize: 11, marginBottom: 6 }}>{s.speaker}</div>}
      <div style={{ color: "#c8f060", fontWeight: 500, fontSize: 16 }}>{fmtLabel(s.durationSeconds)}</div>
    </div>
  );
}

export default function Home() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [date, setDate] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);
  const [speaker, setSpeaker] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sermons");
      const data = await res.json();
      setSermons(Array.isArray(data) ? data : []);
    } catch { setSermons([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!date) { setFormErr("Date is required."); return; }
    setSaving(true); setFormErr("");
    const res = await fetch("/api/sermons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, minutes, seconds, speaker, title }),
    });
    if (res.ok) {
      setShowForm(false);
      setDate(""); setMinutes(30); setSeconds(0); setSpeaker(""); setTitle("");
      load();
    } else {
      const d = await res.json();
      setFormErr(d.error || "Failed to save.");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch("/api/sermons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const sorted = [...sermons].sort((a, b) => a.date.localeCompare(b.date));
  const avg = sermons.length
    ? sermons.reduce((s, x) => s + x.durationSeconds, 0) / sermons.length
    : 0;
  const avgMin = avg / 60;
  const latest = sorted[sorted.length - 1];
  const longest = sermons.length ? sermons.reduce((a, b) => a.durationSeconds > b.durationSeconds ? a : b) : null;
  const shortest = sermons.length ? sermons.reduce((a, b) => a.durationSeconds < b.durationSeconds ? a : b) : null;

  const chartData = sorted.map(s => ({ ...s, minutes: s.durationSeconds / 60 }));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{
        borderBottom: "1px solid #2a2a2e",
        padding: "0 32px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#e8e8ea",
          }}>Sermon Log</span>
          {sermons.length > 0 && (
            <span style={{ color: "#4a4a52", fontSize: 12 }}>
              {sermons.length} entries
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormErr(""); }}
          style={{
            background: showForm ? "#2a2a2e" : "#c8f060",
            color: showForm ? "#e8e8ea" : "#0e0e0f",
            border: "none",
            borderRadius: 6,
            padding: "6px 16px",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.03em",
            transition: "all 0.15s",
          }}
        >
          {showForm ? "Cancel" : "+ Add Sermon"}
        </button>
      </header>

      {/* Add Form */}
      {showForm && (
        <div style={{
          borderBottom: "1px solid #2a2a2e",
          background: "#161618",
          padding: "20px 32px",
        }}>
          <div style={{ maxWidth: 640, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Duration">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="number" min={0} max={180} value={minutes}
                  onChange={e => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ ...inputStyle, width: 64 }}
                />
                <span style={{ color: "#4a4a52" }}>m</span>
                <input
                  type="number" min={0} max={59} value={seconds}
                  onChange={e => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  style={{ ...inputStyle, width: 64 }}
                />
                <span style={{ color: "#4a4a52" }}>s</span>
              </div>
            </Field>
            <Field label="Speaker (opt.)">
              <input
                type="text" placeholder="—" value={speaker}
                onChange={e => setSpeaker(e.target.value)}
                style={{ ...inputStyle, width: 140 }}
              />
            </Field>
            <Field label="Title (opt.)">
              <input
                type="text" placeholder="—" value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ ...inputStyle, width: 180 }}
              />
            </Field>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: "#c8f060", color: "#0e0e0f",
                border: "none", borderRadius: 6,
                padding: "8px 20px", fontSize: 12,
                fontWeight: 600, letterSpacing: "0.03em",
                opacity: saving ? 0.6 : 1,
                marginBottom: 1,
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {formErr && (
            <p style={{ color: "#f06060", fontSize: 12, marginTop: 8 }}>{formErr}</p>
          )}
        </div>
      )}

      <main style={{ flex: 1, padding: "32px 32px 64px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        {loading ? (
          <div style={{ color: "#4a4a52", paddingTop: 80, textAlign: "center" }}>Loading…</div>
        ) : sermons.length === 0 ? (
          <div style={{ paddingTop: 80, textAlign: "center" }}>
            <p style={{ color: "#4a4a52", marginBottom: 8 }}>No sermons logged yet.</p>
            <p style={{ color: "#3a3a3e", fontSize: 12 }}>Click &quot;+ Add Sermon&quot; to get started.</p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 1, marginBottom: 32, flexWrap: "wrap" }}>
              {[
                { label: "Average", value: fmtLabel(Math.round(avg)), sub: `across ${sermons.length} sermons` },
                { label: "Most Recent", value: latest ? fmtLabel(latest.durationSeconds) : "—", sub: latest ? fmtDate(latest.date) : "" },
                { label: "Longest", value: longest ? fmtLabel(longest.durationSeconds) : "—", sub: longest ? fmtDate(longest.date) : "" },
                { label: "Shortest", value: shortest ? fmtLabel(shortest.durationSeconds) : "—", sub: shortest ? fmtDate(shortest.date) : "" },
              ].map((stat, i) => (
                <div key={i} style={{
                  flex: "1 1 160px",
                  background: "#161618",
                  border: "1px solid #2a2a2e",
                  borderRadius: i === 0 ? "8px 0 0 8px" : i === 3 ? "0 8px 8px 0" : 0,
                  padding: "20px 24px",
                  borderLeft: i > 0 ? "none" : "1px solid #2a2a2e",
                }}>
                  <div style={{ color: "#4a4a52", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                    {stat.label}
                  </div>
                  <div style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#e8e8ea",
                    lineHeight: 1,
                    marginBottom: 6,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ color: "#4a4a52", fontSize: 11 }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{
              background: "#161618",
              border: "1px solid #2a2a2e",
              borderRadius: 8,
              padding: "28px 16px 16px",
              marginBottom: 32,
            }}>
              <div style={{ color: "#4a4a52", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20, paddingLeft: 8 }}>
                Duration over time
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 24, left: 0, bottom: 4 }}

                >
                  <CartesianGrid stroke="#1e1e21" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtShort}
                    tick={{ fill: "#4a4a52", fontSize: 11, fontFamily: "'DM Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={v => `${Math.floor(v)}m`}
                    tick={{ fill: "#4a4a52", fontSize: 11, fontFamily: "'DM Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2a2a2e", strokeWidth: 1 }} />
                  <ReferenceLine
                    y={avgMin}
                    stroke="#3a3a3e"
                    strokeDasharray="4 4"
                    label={{ value: "avg", fill: "#4a4a52", fontSize: 10, position: "right" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="minutes"
                    stroke="#c8f060"
                    strokeWidth={1.5}
                    dot={{ fill: "#0e0e0f", stroke: "#c8f060", strokeWidth: 2, r: 4 }}
                    activeDot={{ fill: "#c8f060", stroke: "#c8f060", r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div style={{
              background: "#161618",
              border: "1px solid #2a2a2e",
              borderRadius: 8,
              overflow: "hidden",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 80px 32px",
                gap: 0,
                borderBottom: "1px solid #2a2a2e",
                padding: "10px 20px",
              }}>
                {["Date", "Duration", "Speaker", "Title", ""].map((h, i) => (
                  <span key={i} style={{ color: "#4a4a52", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {[...sorted].reverse().map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 80px 32px",
                    gap: 0,
                    padding: "12px 20px",
                    borderBottom: i < sorted.length - 1 ? "1px solid #1e1e21" : "none",
                    alignItems: "center",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#1e1e21")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ color: "#6b6b72", fontSize: 12 }}>{fmtDate(s.date)}</span>
                  <span style={{ color: "#c8f060", fontSize: 13, fontWeight: 500 }}>{fmtLabel(s.durationSeconds)}</span>
                  <span style={{ color: "#e8e8ea", fontSize: 12 }}>{s.speaker || <span style={{ color: "#2a2a2e" }}>—</span>}</span>
                  <span style={{ color: "#6b6b72", fontSize: 12 }}>{s.title || <span style={{ color: "#2a2a2e" }}>—</span>}</span>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{
                      background: "none", border: "none",
                      color: "#3a3a3e", fontSize: 16,
                      padding: 0, lineHeight: 1,
                      cursor: "pointer",
                      transition: "color 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#f06060")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#3a3a3e")}
                    title="Delete"
                  >×</button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ color: "#4a4a52", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0e0e0f",
  border: "1px solid #2a2a2e",
  borderRadius: 6,
  color: "#e8e8ea",
  padding: "7px 10px",
  fontSize: 13,
  outline: "none",
  width: "100%",
  fontFamily: "'DM Mono', monospace",
};
