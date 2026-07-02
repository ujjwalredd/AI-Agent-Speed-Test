"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TASK_LABELS, scoreColor } from "@/lib/format";
import type { BenchmarkResult, TaskAggregate } from "@/lib/types";

const AXIS = {
  fill: "#57534E",
  fontSize: 11,
  fontFamily: "var(--font-mono), monospace",
};
const TOOLTIP_STYLE = {
  background: "#FFFFFF",
  border: "1px solid rgba(14,14,12,0.85)",
  borderRadius: 0,
  color: "#0E0E0C",
  fontFamily: "var(--font-mono), monospace",
  fontSize: 12,
};
const GRID = "rgba(14,14,12,0.08)";
const CURSOR = { fill: "rgba(14,14,12,0.04)" };

// Editorial series palette: ink + vermillion first, then distinguishable
// neutrals — never red/green pairs.
const SERIES = ["#0E0E0C", "#FF4D00", "#2563EB", "#15803D"];

// Quality per task for a single run.
export function TaskQualityChart({ tasks }: { tasks: TaskAggregate[] }) {
  const data = tasks.map((t) => ({
    name: TASK_LABELS[t.taskType],
    quality: Math.round(t.qualityScore * 100),
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -14 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={AXIS} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis domain={[0, 100]} tick={AXIS} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR} />
        <Bar dataKey="quality" name="Quality %" radius={[0, 0, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={scoreColor(d.quality)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Six sub-scores for a single run.
export function SubScoreChart({ result }: { result: BenchmarkResult }) {
  const s = result.sub;
  const data = [
    { name: "Speed", value: s.speed },
    { name: "Accuracy", value: s.accuracy },
    { name: "Quality", value: s.quality },
    { name: "Reliability", value: s.reliability },
    { name: "Consistency", value: s.consistency },
    { name: "Cost", value: s.cost },
  ];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -14 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={AXIS} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis domain={[0, 100]} tick={AXIS} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR} />
        <Bar dataKey="value" name="Score">
          {data.map((d, i) => (
            <Cell key={i} fill={scoreColor(d.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Grouped comparison of overall + sub-scores across multiple agents.
export function ComparisonChart({
  results,
}: {
  results: { label: string; result: BenchmarkResult }[];
}) {
  const axes = ["Overall", "Speed", "Accuracy", "Quality", "Reliability", "Consistency", "Cost"];
  const data = axes.map((axis) => {
    const row: Record<string, string | number> = { axis };
    results.forEach((r, i) => {
      const s = r.result.sub;
      const map: Record<string, number> = {
        Overall: r.result.overall,
        Speed: s.speed,
        Accuracy: s.accuracy,
        Quality: s.quality,
        Reliability: s.reliability,
        Consistency: s.consistency,
        Cost: s.cost,
      };
      row[`m${i}`] = map[axis];
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -14 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="axis" tick={AXIS} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis domain={[0, 100]} tick={AXIS} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR} />
        <Legend
          wrapperStyle={{
            color: "#0E0E0C",
            fontSize: 12,
            fontFamily: "var(--font-mono), monospace",
          }}
        />
        {results.map((r, i) => (
          <Bar key={i} dataKey={`m${i}`} name={r.label} fill={SERIES[i % SERIES.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
