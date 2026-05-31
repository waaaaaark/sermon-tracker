"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface PlayerControl {
  name: string;
  base: number;
  override: number;
  total: number;
  guesses: number;
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2ddd8", borderRadius: 8 };
const sectionLabel: React.CSSProperties = { color: "#b5b0aa", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 };

export default function ControlPage() {
  const [players, setPlayers] = useState<PlayerControl[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const data: PlayerControl[] = await fetch("/api/control").then(r => r.json());
    setPlayers(data);
    const t: Record<string, number> = {};
    data.forEach(p => { t[p.name] = p.total; });
    setTotals(t);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleReset() {
    const t: Record<string, number> = {};
    players.forEach(p => { t[p.name] = 0; });
    setTotals(t);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setErr("");
    const overrides: Record<string, number> = {};
    players.forEach(p => {
      overrides[p.name] = (totals[p.name] ?? p.total) - p.base;
    });
    const res = await fetch("/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overrides }),
    });
    if (res.ok) {
      await load();
      setSaved(true);
    } else {
      const d = await res.json();
      setErr(d.error || "Failed to save.");
    }
    setSaving(false);
  }

  const dirty = players.some(p => (totals[p.name] ?? p.total) !== p.total);

  return (
    <div style={{ minHeight: "100vh", background: "#f7f5f2" }}>
      <header style={{ borderBottom: "1px solid #e2ddd8", background: "#fff", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ color: "#b5b0aa", fontSize: 12 }}>← Back</Link>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#1a1714" }}>Control Panel</span>
        <div style={{ width: 48 }} />
      </header>

      <main style={{ maxWidth: 500, margin: "0 auto", padding: "32px 24px 64px" }}>
        {loading ? (
          <div style={{ color: "#b5b0aa", textAlign: "center", paddingTop: 60 }}>Loading…</div>
        ) : (
          <>
            <div style={{ ...card, padding: 24, marginBottom: 20 }}>
              <div style={sectionLabel}>Player Points</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Player", "Computed", "Adjust", "Total"].map((h, i) => (
                      <th key={i} style={{ textAlign: i === 0 ? "left" : "right", color: "#b5b0aa", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", paddingBottom: 12, fontWeight: 500 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.map(p => {
                    const currentTotal = totals[p.name] ?? p.total;
                    const currentOverride = currentTotal - p.base;
                    const changed = currentTotal !== p.total;
                    return (
                      <tr key={p.name} style={{ borderTop: "1px solid #f0ede9" }}>
                        <td style={{ padding: "10px 0", fontSize: 13, color: "#1a1714", fontWeight: 500 }}>{p.name}</td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontSize: 12, color: "#b5b0aa" }}>{p.base}</td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontSize: 12, color: currentOverride === 0 ? "#ccc8c2" : currentOverride > 0 ? "#2d6a4f" : "#c0392b" }}>
                          {currentOverride > 0 ? `+${currentOverride}` : currentOverride === 0 ? "—" : currentOverride}
                        </td>
                        <td style={{ padding: "10px 0 10px 16px", textAlign: "right" }}>
                          <input
                            type="number"
                            value={currentTotal}
                            onChange={e => {
                              const v = parseInt(e.target.value, 10);
                              setTotals(t => ({ ...t, [p.name]: isNaN(v) ? 0 : v }));
                              setSaved(false);
                            }}
                            style={{
                              background: changed ? "#f0faf4" : "#f7f5f2",
                              border: `1px solid ${changed ? "#a8d5b5" : "#e2ddd8"}`,
                              borderRadius: 6, color: "#1a1714",
                              padding: "4px 8px", fontSize: 13, outline: "none",
                              width: 64, textAlign: "right",
                              fontFamily: "'DM Mono', monospace",
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ color: "#ccc8c2", fontSize: 10, marginTop: 14, fontStyle: "italic", lineHeight: 1.5 }}>
                Computed = points from game history · Adjust = manual delta · Total = shown on leaderboard. Future game results accumulate on top of the total you set.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={handleReset}
                style={{ background: "#f0ede9", color: "#1a1714", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 500 }}
              >
                Reset All to Zero
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                style={{ background: "#2d6a4f", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 12, fontWeight: 600, opacity: saving || !dirty ? 0.5 : 1 }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && <span style={{ color: "#2d6a4f", fontSize: 12 }}>✓ Saved</span>}
              {err && <span style={{ color: "#c0392b", fontSize: 12 }}>{err}</span>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
