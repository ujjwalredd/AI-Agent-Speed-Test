"use client";

import ScoreGauge from "./ScoreGauge";
import MetricCard from "./MetricCard";
import TaskResultTable from "./TaskResultTable";
import { SubScoreChart, TaskQualityChart } from "./Charts";
import { fmtCost, fmtMs, fmtNum } from "@/lib/format";
import type { BenchmarkResult } from "@/lib/types";

const SUB_META: {
  key: keyof BenchmarkResult["sub"];
  label: string;
}[] = [
  { key: "speed", label: "Speed" },
  { key: "accuracy", label: "Accuracy" },
  { key: "quality", label: "Quality" },
  { key: "reliability", label: "Reliability" },
  { key: "consistency", label: "Consistency" },
  { key: "cost", label: "Cost efficiency" },
];

export default function ResultsDashboard({
  result,
}: {
  result: BenchmarkResult;
}) {
  return (
    <div className="rise-in space-y-12">
      {/* Report masthead */}
      <div className="rule-strong pt-5">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          <div className="flex items-center justify-center bg-surface py-6">
            <ScoreGauge score={result.overall} />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <MetricCard label="Model" value={result.modelName} sub={result.provider} />
            <MetricCard label="Avg TTFT" value={fmtMs(result.avgTtftMs)} sub="time to first token" />
            <MetricCard
              label="Throughput"
              value={`${result.avgTokensPerSec.toFixed(0)} t/s`}
              sub="tokens per second"
            />
            <MetricCard label="Total cost" value={fmtCost(result.totalCostUsd)} sub="all tasks" />
            <MetricCard label="Input tokens" value={fmtNum(result.totalInputTok)} />
            <MetricCard label="Output tokens" value={fmtNum(result.totalOutputTok)} />
          </div>
        </div>
      </div>

      {/* Sub-scores with weights */}
      <section className="relative">
        <span aria-hidden="true" className="ghost-num absolute -top-8 right-0">
          01
        </span>
        <h2 className="display-title mb-2 text-ink">Score breakdown</h2>
        <p className="mb-6 max-w-2xl text-sm leading-6 text-ink-soft">
          The overall score blends six weighted axes — the weight of each axis is
          printed on its readout, so the number is fully explainable.
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {SUB_META.map((m) => (
            <MetricCard
              key={m.key}
              label={m.label}
              value={`${result.sub[m.key]}`}
              score={result.sub[m.key]}
              weight={result.weights[m.key]}
            />
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="relative">
        <span aria-hidden="true" className="ghost-num absolute -top-8 right-0">
          02
        </span>
        <h2 className="display-title mb-6 text-ink">Charts</h2>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rule-strong bg-surface p-5">
            <h3 className="mono-label mb-3">Quality by task</h3>
            <TaskQualityChart tasks={result.tasks} />
          </div>
          <div className="rule-strong bg-surface p-5">
            <h3 className="mono-label mb-3">Sub-scores</h3>
            <SubScoreChart result={result} />
          </div>
        </div>
      </section>

      {/* Per-task spec sheet */}
      <section className="relative">
        <span aria-hidden="true" className="ghost-num absolute -top-8 right-0">
          03
        </span>
        <h2 className="display-title mb-6 text-ink">Task results</h2>
        <TaskResultTable tasks={result.tasks} />
      </section>
    </div>
  );
}
