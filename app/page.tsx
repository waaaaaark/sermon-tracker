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
      background: "#fff", border: "1px solid #e2ddd8",
      borderRadius: 6, padding: "10px 14px", fontSize: 13,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <div style={{ color: "#8a837a", marginBottom: 4, fontSize: 11 }}>{fmtDate(s.date)}</div>
      <div style={{ color: "#2d6a4f", fontWeight: 600, fontSize: 16 }}>{fmtLabel(s.durationSeconds)}</div>
    </div>
  );
}

export default function Home() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [date, setDate] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);
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
      body: JSON.stringify({ date, minutes, seconds }),
    });
    if (res.ok) {
      setShowForm(false);
      setDate(""); setMinutes(30); setSeconds(0);
      load();
    } else {
      const d = await res.json();
      setFormErr(d.error || "Failed to save.");
    }
    setSaving(false);
  }

  async function handleDelete(id: string, dateStr: string) {
    if (!confirm(`Delete entry for ${fmtDate(dateStr)}?`)) return;
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f7f5f2" }}>

      {/* Header */}
      <header style={{
        borderBottom: "1px solid #e2ddd8",
        background: "#fff",
        padding: "0 32px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#1a1714",
          }}>Sermon Log</span>
          {sermons.length > 0 && (
            <span style={{ color: "#b5b0aa", fontSize: 12 }}>
              {sermons.length} entries
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormErr(""); }}
          style={{
            background: showForm ? "#f0ede9" : "#2d6a4f",
            color: showForm ? "#1a1714" : "#fff",
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
          borderBottom: "1px solid #e2ddd8",
          background: "#fff",
          padding: "20px 32px",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
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
                <span style={{ color: "#b5b0aa" }}>m</span>
                <input
                  type="number" min={0} max={59} value={seconds}
                  onChange={e => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  style={{ ...inputStyle, width: 64 }}
                />
                <span style={{ color: "#b5b0aa" }}>s</span>
              </div>
            </Field>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: "#2d6a4f", color: "#fff",
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
            <p style={{ color: "#c0392b", fontSize: 12, marginTop: 8 }}>{formErr}</p>
          )}
        </div>
      )}

      <main style={{ flex: 1, padding: "32px 32px 64px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        {loading ? (
          <div style={{ color: "#b5b0aa", paddingTop: 80, textAlign: "center" }}>Loading…</div>
        ) : sermons.length === 0 ? (
          <div style={{ paddingTop: 80, textAlign: "center" }}>
            <p style={{ color: "#8a837a", marginBottom: 8 }}>No sermons logged yet.</p>
            <p style={{ color: "#b5b0aa", fontSize: 12 }}>Click &quot;+ Add Sermon&quot; to get started.</p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 1, marginBottom: 28, flexWrap: "wrap" }}>
              {[
                { label: "Average", value: fmtLabel(Math.round(avg)), sub: `across ${sermons.length} sermons` },
                { label: "Most Recent", value: latest ? fmtLabel(latest.durationSeconds) : "—", sub: latest ? fmtDate(latest.date) : "" },
                { label: "Longest", value: longest ? fmtLabel(longest.durationSeconds) : "—", sub: longest ? fmtDate(longest.date) : "" },
                { label: "Shortest", value: shortest ? fmtLabel(shortest.durationSeconds) : "—", sub: shortest ? fmtDate(shortest.date) : "" },
              ].map((stat, i) => (
                <div key={i} style={{
                  flex: "1 1 160px",
                  background: "#fff",
                  border: "1px solid #e2ddd8",
                  borderRadius: i === 0 ? "8px 0 0 8px" : i === 3 ? "0 8px 8px 0" : 0,
                  padding: "18px 22px",
                  borderLeft: i > 0 ? "none" : "1px solid #e2ddd8",
                }}>
                  <div style={{ color: "#b5b0aa", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                    {stat.label}
                  </div>
                  <div style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#1a1714",
                    lineHeight: 1,
                    marginBottom: 6,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ color: "#b5b0aa", fontSize: 11 }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{
              background: "#fff",
              border: "1px solid #e2ddd8",
              borderRadius: 8,
              padding: "24px 12px 16px",
              marginBottom: 28,
            }}>
              <div style={{ color: "#b5b0aa", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20, paddingLeft: 8 }}>
                Duration over time
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="#f0ede9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtShort}
                    tick={{ fill: "#b5b0aa", fontSize: 11, fontFamily: "'DM Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={v => `${Math.floor(v)}m`}
                    tick={{ fill: "#b5b0aa", fontSize: 11, fontFamily: "'DM Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2ddd8", strokeWidth: 1 }} />
                  <ReferenceLine
                    y={avgMin}
                    stroke="#ccc8c2"
                    strokeDasharray="4 4"
                    label={{ value: "avg", fill: "#b5b0aa", fontSize: 10, position: "right" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="minutes"
                    stroke="#2d6a4f"
                    strokeWidth={2}
                    dot={{ fill: "#fff", stroke: "#2d6a4f", strokeWidth: 2, r: 4 }}
                    activeDot={{ fill: "#2d6a4f", stroke: "#2d6a4f", r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div style={{
              background: "#fff",
              border: "1px solid #e2ddd8",
              borderRadius: 8,
              overflow: "hidden",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 32px",
                borderBottom: "1px solid #e2ddd8",
                padding: "10px 20px",
              }}>
                {["Date", "Duration", ""].map((h, i) => (
                  <span key={i} style={{ color: "#b5b0aa", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {[...sorted].reverse().map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 32px",
                    padding: "12px 20px",
                    borderBottom: i < sorted.length - 1 ? "1px solid #f0ede9" : "none",
                    alignItems: "center",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f7f5f2")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ color: "#8a837a", fontSize: 13 }}>{fmtDate(s.date)}</span>
                  <span style={{ color: "#2d6a4f", fontSize: 13, fontWeight: 500 }}>{fmtLabel(s.durationSeconds)}</span>
                  <button
                    onClick={() => handleDelete(s.id, s.date)}
                    style={{
                      background: "none", border: "none",
                      color: "#ccc8c2", fontSize: 18,
                      padding: 0, lineHeight: 1,
                      cursor: "pointer",
                      transition: "color 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#ccc8c2")}
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
      <label style={{ color: "#8a837a", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#f7f5f2",
  border: "1px solid #e2ddd8",
  borderRadius: 6,
  color: "#1a1714",
  padding: "7px 10px",
  fontSize: 13,
  outline: "none",
  width: "100%",
  fontFamily: "'DM Mono', monospace",
};