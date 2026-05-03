"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Sermon } from "@/lib/store";
import { formatDate } from "@/lib/utils";

interface Props {
  sermons: Sermon[];
}

function formatMinutes(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const sermon = payload[0].payload;
    return (
      <div className="sermon-tooltip">
        <p className="tooltip-date">{formatDate(label)}</p>
        {sermon.title && <p className="tooltip-title">{sermon.title}</p>}
        {sermon.speaker && (
          <p className="tooltip-speaker">— {sermon.speaker}</p>
        )}
        <p className="tooltip-duration">{formatMinutes(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function SermonChart({ sermons }: Props) {
  if (sermons.length === 0) {
    return (
      <div className="chart-empty">
        <span>No sermon data yet.</span>
      </div>
    );
  }

  const data = sermons.map((s) => ({
    ...s,
    minutes: s.durationSeconds / 60,
  }));

  const avg =
    sermons.reduce((sum, s) => sum + s.durationSeconds, 0) / sermons.length;
  const avgMin = avg / 60;

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickFormatter={(d) => {
              const [, m, day] = d.split("-");
              return `${parseInt(m)}/${parseInt(day)}`;
            }}
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickFormatter={(v) => `${Math.floor(v)}m`}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avgMin}
            stroke="var(--accent)"
            strokeDasharray="6 3"
            label={{
              value: `avg ${formatMinutes(Math.round(avg))}`,
              fill: "var(--accent)",
              fontSize: 11,
              position: "right",
            }}
          />
          <Line
            type="monotone"
            dataKey="minutes"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={{ fill: "var(--primary)", r: 5, strokeWidth: 0 }}
            activeDot={{ r: 7, fill: "var(--primary-light)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
