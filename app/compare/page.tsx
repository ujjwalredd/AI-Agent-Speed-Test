"use client";

import { useState } from "react";
import ConfigForm from "@/components/ConfigForm";
import ScoreGauge from "@/components/ScoreGauge";
import { ComparisonChart } from "@/components/Charts";
import { BarChartIcon, PlusIcon, XIcon } from "@/components/Icons";
import { streamBenchmark, type BenchmarkConfig } from "@/lib/client";
import { CLAUDE_MODELS } from "@/lib/models";
import { fmtCost, fmtMs } from "@/lib/format";
import type { BenchmarkResult } from "@/lib/types";

interface Slot {
  id: number;
  running: boolean;
  progressText: string;
  error: string | null;
  result: BenchmarkResult | null;
}

let nextId = 2;

export default function ComparePage() {
  const [slots, setSlots] = useState<Slot[]>([
    { id: 0, running: false, progressText: "", error: null, result: null },
    { id: 1, running: false, progressText: "", error: null, result: null },
  ]);

  function update(id: number, patch: Partial<Slot>) {
    setSlots((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function run(id: number, cfg: BenchmarkConfig) {
    update(id, { running: true, error: null, result: null, progressText: "Starting..." });
    try {
      await streamBenchmark(cfg, (ev) => {
        if (ev.type === "task-start") update(id, { progressText: `Running ${ev.taskType}...` });
        else if (ev.type === "done") update(id, { result: ev.result });
        else if (ev.type === "error") update(id, { error: ev.message });
      });
    } catch (err) {
      update(id, { error: err instanceof Error ? err.message : "Failed." });
    } finally {
      update(id, { running: false, progressText: "" });
    }
  }

  function addSlot() {
    if (slots.length >= 4) return;
    setSlots((s) => [
      ...s,
      { id: nextId++, running: false, progressText: "", error: null, result: null },
    ]);
  }

  function removeSlot(id: number) {
    if (slots.length <= 2) return;
    setSlots((s) => s.filter((x) => x.id !== id));
  }

  const completed = slots
    .filter((s) => s.result)
    .map((s, i) => ({ label: s.result!.modelName + ` #${i + 1}`, result: s.result! }));

  return (
    <div className="py-10 sm:py-14">
      <p className="mono-label mb-4">Bench / head to head</p>
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="display-hero text-ink" style={{ fontSize: "clamp(2.75rem, 8vw, 6rem)" }}>
            Side by side.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft">
            Same tasks, same formula, different agents. Compare models, prompts,
            or demo vs live — up to four at once.
          </p>
        </div>
        <button
          className="btn btn-ink px-5 text-sm font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
          disabled={slots.length >= 4}
          onClick={addSlot}
          type="button"
        >
          <PlusIcon className="h-4 w-4" />
          Add agent
        </button>
      </div>

      <div className="mt-10 grid gap-8 border-t-2 border-rule-strong pt-8 md:grid-cols-2 2xl:grid-cols-4">
        {slots.map((slot, idx) => (
          <div key={slot.id} className="space-y-3">
            <div className="flex min-h-11 items-center justify-between border-b border-rule px-1">
              <span className="font-data text-xs font-bold uppercase tracking-widest text-ink">
                Agent {String(idx + 1).padStart(2, "0")}
              </span>
              {slots.length > 2 && (
                <button
                  aria-label={`Remove agent ${idx + 1}`}
                  className="icon-button h-10 min-h-10 w-10 min-w-10 text-ink-soft hover:text-bad"
                  onClick={() => removeSlot(slot.id)}
                  title="Remove"
                  type="button"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <ConfigForm
              onRun={(cfg) => run(slot.id, cfg)}
              disabled={slot.running}
              submitLabel="Run this agent"
              compact
              defaults={{
                model: CLAUDE_MODELS[idx % CLAUDE_MODELS.length].id,
              }}
            />

            {slot.running && (
              <div className="rule-top bg-surface p-3 text-center text-sm font-semibold text-ink-soft">
                <span className="spin mr-2 inline-block h-3 w-3 rounded-full border-2 border-ink/15 border-t-signal align-middle" />
                {slot.progressText || "Running..."}
              </div>
            )}
            {slot.error && (
              <div className="border-l-4 border-bad bg-surface p-3 text-sm font-semibold text-bad" role="alert">
                {slot.error}
              </div>
            )}
            {slot.result && (
              <div className="rule-strong bg-surface p-4">
                <ScoreGauge score={slot.result.overall} size={180} label={slot.result.modelName} />
                <div className="font-data mt-3 grid grid-cols-2 gap-2 text-xs text-ink-soft">
                  <span>TTFT {fmtMs(slot.result.avgTtftMs)}</span>
                  <span>{slot.result.avgTokensPerSec.toFixed(0)} t/s</span>
                  <span>{fmtCost(slot.result.totalCostUsd)}</span>
                  <span>Quality {slot.result.sub.quality}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {completed.length >= 1 && (
        <section className="relative mt-16">
          <span aria-hidden="true" className="ghost-num absolute -top-8 right-0">
            VS
          </span>
          <h2 className="display-title mb-6 flex items-center gap-3 text-ink">
            <BarChartIcon className="h-6 w-6 text-signal-ink" />
            Side-by-side scores
          </h2>
          <div className="rule-strong bg-surface p-5">
            <ComparisonChart results={completed} />
          </div>
        </section>
      )}
    </div>
  );
}
