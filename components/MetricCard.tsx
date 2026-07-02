"use client";

import { scoreColor } from "@/lib/format";

// Instrument readout: hairline top rule, tiny mono label, big tabular value.
// When `weight` is provided, shows the axis weight so the overall score stays
// fully explainable.
export default function MetricCard({
  label,
  value,
  sub,
  score,
  weight,
}: {
  label: string;
  value: string;
  sub?: string;
  score?: number; // 0..100 -> renders a thin meter
  weight?: number; // fraction 0..1
}) {
  return (
    <div className="rule-strong bg-surface px-4 pb-4 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="mono-label">{label}</span>
        {weight !== undefined && (
          <span className="font-data text-[10px] font-semibold text-ink-soft">
            ×{Math.round(weight * 100)}%
          </span>
        )}
      </div>
      <div
        className="font-data mt-2 break-words text-2xl font-bold text-ink sm:text-3xl"
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-ink-soft">{sub}</div>}
      {score !== undefined && (
        <div className="mt-3 h-1 w-full bg-ink/10" role="presentation">
          <div
            className="h-1"
            style={{
              width: `${Math.max(0, Math.min(100, score))}%`,
              background: scoreColor(score),
              transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>
      )}
    </div>
  );
}
