"use client";

import { useRef, useState } from "react";
import ConfigForm from "@/components/ConfigForm";
import { GaugeIcon, XIcon } from "@/components/Icons";
import ProgressPanel, { type TaskProgress } from "@/components/ProgressPanel";
import ResultsDashboard from "@/components/ResultsDashboard";
import { streamBenchmark, type BenchmarkConfig } from "@/lib/client";
import { TASK_ORDER } from "@/lib/format";
import type { BenchmarkResult, ProgressEvent, TaskType } from "@/lib/types";

type ProgressMap = Record<TaskType, TaskProgress>;

function initialProgress(runsPerTask: number): ProgressMap {
  const map = {} as ProgressMap;
  for (const t of TASK_ORDER) {
    map[t] = { status: "pending", runsDone: 0, runsTotal: runsPerTask, failures: 0 };
  }
  return map;
}

export default function TestPage() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressMap | null>(null);
  const [activeTask, setActiveTask] = useState<TaskType | null>(null);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run(cfg: BenchmarkConfig) {
    setRunning(true);
    setError(null);
    setResult(null);
    setActiveTask(null);
    setProgress(initialProgress(cfg.runsPerTask));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamBenchmark(
        cfg,
        (ev: ProgressEvent) => handleEvent(ev),
        controller.signal,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Benchmark failed.");
    } finally {
      setRunning(false);
      setActiveTask(null);
    }
  }

  function handleEvent(ev: ProgressEvent) {
    switch (ev.type) {
      case "task-start":
        setActiveTask(ev.taskType);
        setProgress((p) =>
          p ? { ...p, [ev.taskType]: { ...p[ev.taskType], status: "running" } } : p,
        );
        break;
      case "run-complete":
        setProgress((p) => {
          if (!p) return p;
          const cur = p[ev.taskType];
          return {
            ...p,
            [ev.taskType]: {
              ...cur,
              runsDone: cur.runsDone + 1,
              lastTtftMs: ev.ttftMs,
              failures: cur.failures + (ev.success ? 0 : 1),
            },
          };
        });
        break;
      case "task-done":
        setProgress((p) =>
          p
            ? { ...p, [ev.task.taskType]: { ...p[ev.task.taskType], status: "done" } }
            : p,
        );
        break;
      case "done":
        setResult(ev.result);
        break;
      case "error":
        setError(ev.message);
        break;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  return (
    <div className="py-10 sm:py-14">
      <p className="mono-label mb-4">Bench / single run</p>
      <h1 className="display-hero text-ink" style={{ fontSize: "clamp(2.75rem, 8vw, 6rem)" }}>
        Run the test.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft">
        Start with the demo provider, or run a live Claude model — paste a key
        (with a show/hide toggle) or pick one saved in the encrypted vault.
      </p>

      <div className="mt-10 grid gap-10 border-t-2 border-rule-strong pt-8 lg:grid-cols-[400px_1fr]">
        <aside className="space-y-3">
          <ConfigForm onRun={run} disabled={running} />
          {running && (
            <button
              className="btn btn-outline w-full px-4 text-sm text-bad hover:border-bad hover:text-bad"
              onClick={stop}
              type="button"
            >
              <XIcon className="h-4 w-4" />
              Cancel run
            </button>
          )}
        </aside>

        <div className="space-y-6">
          {error && (
            <div
              className="border-l-4 border-bad bg-surface p-4 text-sm font-semibold text-bad"
              role="alert"
            >
              {error}
            </div>
          )}

          {running && progress && (
            <ProgressPanel progress={progress} activeTask={activeTask} />
          )}

          {result && <ResultsDashboard result={result} />}

          {!running && !result && !error && (
            <div className="rule-strong flex min-h-[360px] items-center justify-center bg-surface p-8 text-center">
              <div>
                <GaugeIcon className="mx-auto h-10 w-10 text-ink-soft" />
                <h2 className="display-title mt-4 text-ink" style={{ fontSize: "1.75rem" }}>
                  Ready for a run
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-ink-soft">
                  Live progress, the score gauge, charts, and per-task metrics land here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
