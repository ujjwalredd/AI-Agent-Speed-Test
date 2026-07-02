"use client";

import { TASK_LABELS, fmtCost, fmtMs, fmtNum } from "@/lib/format";
import type { TaskAggregate } from "@/lib/types";

// Printed spec-sheet table: strong top rule, hairline row dividers, mono data.
export default function TaskResultTable({ tasks }: { tasks: TaskAggregate[] }) {
  return (
    <div className="rule-strong overflow-x-auto bg-surface">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-rule text-left">
            {["Task", "Quality", "TTFT", "Tokens/s", "Out tok", "Cost", "Success"].map(
              (h) => (
                <th key={h} className="mono-label px-4 py-3 font-semibold">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--rule)]">
          {tasks.map((t, i) => (
            <tr key={t.taskType}>
              <td className="px-4 py-3 font-semibold text-ink">
                <span className="font-data mr-2 text-[11px] text-ink-soft">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {TASK_LABELS[t.taskType]}
              </td>
              <td className="px-4 py-3">
                <QualityBadge value={t.qualityScore} />
              </td>
              <td className="font-data px-4 py-3 text-ink-soft">{fmtMs(t.avgTtftMs)}</td>
              <td className="font-data px-4 py-3 text-ink-soft">
                {t.avgTokensPerSec ? t.avgTokensPerSec.toFixed(1) : "-"}
              </td>
              <td className="font-data px-4 py-3 text-ink-soft">{fmtNum(t.avgOutputTok)}</td>
              <td className="font-data px-4 py-3 text-ink-soft">{fmtCost(t.costUsd)}</td>
              <td className="font-data px-4 py-3 font-semibold text-ink">
                {Math.round(t.successRate * 100)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QualityBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#15803D" : pct >= 50 ? "#0E0E0C" : "#C2410C";
  return (
    <span
      className="font-data inline-block border px-2 py-0.5 text-xs font-bold"
      style={{ borderColor: color, color }}
    >
      {pct}%
    </span>
  );
}
