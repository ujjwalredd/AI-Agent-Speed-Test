"use client";

import { scoreGrade } from "@/lib/format";

// Editorial instrument dial: thin vermillion arc over a hairline track, fine
// ruler ticks, oversized tabular digits, grade word set in display caps.
export default function ScoreGauge({
  score,
  size = 280,
  label = "Agent Performance Score",
  animate = true,
}: {
  score: number;
  size?: number;
  label?: string;
  animate?: boolean;
}) {
  const stroke = 6;
  const pad = 14; // room for ticks outside the arc
  const r = size / 2 - pad - stroke;
  const cx = size / 2;
  const cy = size / 2;
  const clamped = Math.max(0, Math.min(100, score));
  const circumference = round(Math.PI * r);
  const dash = round((clamped / 100) * circumference);

  // 21 ruler ticks across the semicircle (every 5 points, longer every 25).
  // Coordinates are rounded so server and client render identical strings
  // (raw floats serialize differently, causing hydration mismatches).
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const t = i / 20;
    const angle = Math.PI * (1 - t); // 180° -> 0°
    const major = i % 5 === 0;
    const r1 = r + stroke + 3;
    const r2 = r1 + (major ? 9 : 5);
    return {
      x1: round(cx + r1 * Math.cos(angle)),
      y1: round(cy - r1 * Math.sin(angle)),
      x2: round(cx + r2 * Math.cos(angle)),
      y2: round(cy - r2 * Math.sin(angle)),
      major,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg
        role="img"
        aria-label={`${label}: ${Math.round(clamped)} out of 100 — ${scoreGrade(clamped)}`}
        width={size}
        height={size / 2 + 34}
        viewBox={`0 0 ${size} ${size / 2 + 34}`}
      >
        {/* ruler ticks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.major ? "rgba(14,14,12,0.55)" : "rgba(14,14,12,0.22)"}
            strokeWidth={t.major ? 1.5 : 1}
          />
        ))}
        {/* track */}
        <path
          d={arc(cx, cy, r)}
          fill="none"
          stroke="rgba(14,14,12,0.12)"
          strokeWidth={stroke}
        />
        {/* value — the single vermillion accent */}
        <path
          d={arc(cx, cy, r)}
          fill="none"
          stroke="#FF4D00"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          style={animate ? { transition: "stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)" } : undefined}
        />
        {/* endpoint scale markers */}
        <text x={cx - r} y={cy + 18} textAnchor="middle" className="font-data" fontSize={11} fill="#57534E">
          0
        </text>
        <text x={cx + r} y={cy + 18} textAnchor="middle" className="font-data" fontSize={11} fill="#57534E">
          100
        </text>
        {/* score digits — huge, tabular */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={size * 0.28}
          fontWeight={800}
          fill="#0E0E0C"
          style={{
            fontFamily: "var(--font-display), sans-serif",
            letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(clamped)}
        </text>
        {/* grade word */}
        <text
          x={cx}
          y={cy + 24}
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          fill="#C2410C"
          style={{
            fontFamily: "var(--font-mono), monospace",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {scoreGrade(clamped).toUpperCase()}
        </text>
      </svg>
      <div className="mono-label mt-2">{label}</div>
    </div>
  );
}

// Semicircle arc path, left to right, opening upward.
function arc(cx: number, cy: number, r: number): string {
  return `M ${round(cx - r)} ${cy} A ${round(r)} ${round(r)} 0 0 1 ${round(cx + r)} ${cy}`;
}

// Round to 2 decimals for stable, hydration-safe SVG coordinate strings.
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
