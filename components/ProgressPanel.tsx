"use client";

import { TASK_LABELS, TASK_ORDER, fmtMs } from "@/lib/format";
import { CheckIcon, XIcon } from "@/components/Icons";
import type { TaskType } from "@/lib/types";

export interface TaskProgress {
  status: "pending" | "running" | "done";
  runsDone: number;
  runsTotal: number;
  lastTtftMs?: number;
  failures: number;
}

// Spec-sheet style live progress: hairline-divided rows, mono numerics.
export default function ProgressPanel({
  progress,
  activeTask,
}: {
  progress: Record<TaskType, TaskProgress>;
  activeTask: TaskType | null;
}) {
  return (
    <section aria-live="polite" className="rule-strong bg-surface px-5 pb-2 pt-4">
      <div className="mb-3 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="spin inline-block h-4 w-4 rounded-full border-2 border-ink/15 border-t-signal"
        />
        <span className="font-display text-sm font-bold uppercase tracking-wide text-ink">
          Benchmark in progress
        </span>
      </div>
      <ol className="divide-y divide-[var(--rule)]">
        {TASK_ORDER.map((t, i) => {
          const p = progress[t];
          const isActive = activeTask === t;
          return (
            <li
              key={t}
              className={`flex min-h-12 items-center justify-between gap-3 px-1 py-2.5 ${
                isActive ? "bg-signal/5" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-data w-6 text-[11px] font-semibold text-ink-soft">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <StatusMark status={p.status} />
                <span
                  className={`text-sm font-medium ${
                    p.status === "pending" ? "text-ink-soft" : "text-ink"
                  }`}
                >
                  {TASK_LABELS[t]}
                </span>
              </div>
              <div className="font-data flex flex-wrap items-center justify-end gap-3 text-xs text-ink-soft">
                {p.lastTtftMs ? <span>TTFT {fmtMs(p.lastTtftMs)}</span> : null}
                {p.failures > 0 ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-bad">
                    <XIcon className="h-3.5 w-3.5" /> {p.failures} failed
                  </span>
                ) : null}
                <span className="font-semibold text-ink">
                  {p.runsDone}/{p.runsTotal}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StatusMark({ status }: { status: TaskProgress["status"] }) {
  if (status === "done") {
    return (
      <span className="grid h-5 w-5 place-items-center bg-ok text-white" aria-label="done">
        <CheckIcon className="h-3 w-3" />
      </span>
    );
  }
  if (status === "running") {
    return (
      <span
        className="h-5 w-5 border-2 border-signal"
        aria-label="running"
        style={{ background: "rgba(255,77,0,0.15)" }}
      />
    );
  }
  return <span className="h-5 w-5 border border-[var(--rule)]" aria-label="pending" />;
}
