# AI Agent Speed Test

A full-stack web app in the spirit of **Fast.com** / **Speedtest.net**, but for
benchmarking **AI agents and LLMs** instead of internet speed. Connect a Claude
model (or the built-in demo provider), run a fixed suite of tasks, and get a
clear **Agent Performance Score** from 0–100 with a full breakdown.

Built with **Next.js (App Router) + TypeScript**, the official
**`@anthropic-ai/sdk`**, **Tailwind CSS**, and **Recharts**. Fully **stateless** —
no database, no persistence, deploys anywhere with zero config.

## Features

- **Landing page** with one primary action: **Start Agent Test**, plus a live
  score gauge.
- **6-task benchmark suite**: factual recall, reasoning, code generation,
  summarization, multi-step planning, and tool use / function calling.
- **Streaming metrics** per call — time to first token, total time, tokens/sec,
  input/output tokens, estimated cost, success/failure.
- **Explainable 0–100 score** blending six weighted axes: Speed, Accuracy,
  Quality, Reliability, Consistency, Cost efficiency. Weights are shown in the UI.
- **Results dashboard** — gauge, sub-scores, latency/token stats, per-task table,
  and charts (Recharts).
- **Comparison mode** — run 2–4 agents side by side (e.g. Fable 5 vs Haiku 4.5,
  or demo vs real) with a grouped comparison chart.
- **Demo provider** so the app works with **zero API keys** (synthetic numbers).
- **Ephemeral API keys** — paste an Anthropic key to run a live benchmark. The key
  is sent over HTTPS, used in memory for that run only, and is **never stored,
  logged, or written to disk**. The field has a show/hide toggle so you can check
  what you pasted. (Or set a server-side `ANTHROPIC_API_KEY` so users don't paste
  anything.)
- **Big Type Editorial design** — light theme, oversized Archivo display type,
  hairline rules, mono data readouts, one vermillion accent. No logo — the
  identity is typographic.

## Requirements

- Node.js 20+ (developed on 22)
- npm

## Setup

No database, no required configuration.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

The app is stateless, so deployment is trivial:

1. Import the repo into Vercel.
2. Deploy. That's it — the build is just `next build`, and there are **no required
   environment variables**.

Optional Vercel environment variables:
- `ANTHROPIC_API_KEY` — a server-side default key so users can run live benchmarks
  without pasting their own.
- `DEFAULT_TIMEOUT_MS` — per-request timeout (default 60000).

> **No API key?** On the **Run test** page, leave **"Use demo provider"** checked
> to run against the built-in mock and see the full flow end to end.

> **Real Claude runs:** switch to **Claude API**, pick a model, and paste an
> **Anthropic API key** (`sk-ant-...`) — used for that run only, never stored. The
> field has a show/hide toggle. Alternatively set `ANTHROPIC_API_KEY` in `.env`
> for a server-side default so users don't paste anything.

## Environment variables

All optional — the app runs with none set.

| Variable             | Required | Description                                                        |
| -------------------- | -------- | ------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`  | no       | Server-side default key so users can run live tests without pasting. |
| `DEFAULT_TIMEOUT_MS` | no       | Per-request timeout in ms (default `60000`).                       |

## How the score works

Each task runs `runsPerTask` times (1–5). For every call the app records timing
and token usage, and a **heuristic checker** scores output quality 0–1 (keyword
match, code/JSON validity, list-length checks, and — for tool use — whether the
model returned a valid `tool_use` block with the right arguments).

The overall score is a weighted blend of six normalized (0–100) sub-scores:

| Axis         | Default weight | Derived from                                        |
| ------------ | -------------- | --------------------------------------------------- |
| Accuracy     | 0.25           | Mean task quality (pass rate)                       |
| Speed        | 0.20           | Time to first token + tokens/sec vs reference bands |
| Quality      | 0.20           | Mean heuristic quality                              |
| Reliability  | 0.15           | 1 − error rate                                      |
| Consistency  | 0.10           | Low variance of quality + latency across runs       |
| Cost         | 0.10           | Cost per run vs reference bands (lower is better)   |

Reference bands live in [`lib/scoring.ts`](lib/scoring.ts) and are documented
inline so the score is fully transparent.

## Project structure

```
app/
  page.tsx                 Landing page
  test/page.tsx            Run config + live progress + results dashboard
  compare/page.tsx         Side-by-side comparison
  api/benchmark/route.ts   POST: run suite, stream progress via SSE
lib/
  providers/anthropic.ts   Claude streaming client (measures TTFT, usage, stop_reason)
  providers/mock.ts        Demo provider (no key, no network)
  providers/index.ts       Provider dispatch
  models.ts                Claude model catalog + pricing (client-safe)
  tasks.ts                 The 6 benchmark tasks + heuristic checkers
  runner.ts                Runs the suite, yields progress events
  metrics.ts               Timing/stats aggregation
  scoring.ts               Sub-scores + overall score formula
  types.ts, format.ts, client.ts
components/                ScoreGauge, MetricCard, ProgressPanel, TaskResultTable,
                           Charts, ConfigForm, ResultsDashboard
```

## Extending

The system is intentionally modular:

- **Add a benchmark task** — append a `BenchmarkTask` to the `TASKS` array in
  [`lib/tasks.ts`](lib/tasks.ts) with a prompt and a `check()` quality function.
  It automatically appears in runs and the dashboard.
- **Add a model** — add an entry to `CLAUDE_MODELS` in
  [`lib/models.ts`](lib/models.ts) (id, label, pricing).
- **Add a provider** — implement a `callX(req): Promise<ModelCallResult>` under
  `lib/providers/`, then wire it into `callModel()` in
  [`lib/providers/index.ts`](lib/providers/index.ts).

## Notes

- Real Claude calls stream via `client.messages.stream(...)` so time-to-first-token
  is measured accurately. Default models: Fable 5, Opus 4.8, Sonnet 5, Haiku 4.5.
- Prices in `lib/models.ts` are USD per 1M tokens and are used only to estimate
  cost from reported token usage.
