# AI Agent Speed Test

A full-stack web app in the spirit of **Fast.com** / **Speedtest.net**, but for
benchmarking **AI agents and LLMs** instead of internet speed. Connect a Claude
model (or the built-in demo provider), run a fixed suite of tasks, and get a
clear **Agent Performance Score** from 0–100 with a full breakdown.

Built with **Next.js (App Router) + TypeScript**, the official
**`@anthropic-ai/sdk`**, **Prisma + SQLite**, **Tailwind CSS**, and **Recharts**.

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
- **Encrypted API-key vault** — save keys on the site with a label; they are
  encrypted at rest with **AES-256-GCM** (only the ciphertext ever touches the
  database), listed masked (`sk-ant-…AB12`), revealable on demand via the eye
  button (auto re-masks after 12s), and deletable. Or paste a key ephemerally —
  used in-memory for one run, never stored. The paste field has a show/hide
  toggle so you can always check what you pasted. Plaintext keys are never
  logged or returned by list endpoints.
- **Big Type Editorial design** — light theme, oversized Archivo display type,
  hairline rules, mono data readouts, one vermillion accent. No logo — the
  identity is typographic.

## Requirements

- Node.js 20+ (developed on 22)
- npm

## Setup

The app uses **PostgreSQL** (works locally and on serverless hosts like Vercel).
Get a free serverless database at [neon.tech](https://neon.tech), Vercel Postgres,
or Supabase.

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your Postgres connection string and
# KEY_VAULT_SECRET to a random value (openssl rand -hex 32).

# 3. Create the tables from the schema
npx prisma db push

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

SQLite does **not** work on Vercel (its filesystem is read-only and ephemeral), so
the app uses hosted Postgres.

1. Create a Postgres database — e.g. [neon.tech](https://neon.tech) (free). Copy the
   **direct** (non-pooled) connection string.
2. Import the repo into Vercel.
3. In **Vercel → Project → Settings → Environment Variables**, add:
   - `DATABASE_URL` — the Postgres connection string
   - `KEY_VAULT_SECRET` — a random 32-byte secret (`openssl rand -hex 32`)
   - *(optional)* `ANTHROPIC_API_KEY` — a server-side default key
4. Deploy. The build runs `prisma generate && prisma db push && next build`, which
   creates the tables automatically on first deploy — no manual migration step.

> If the build fails with `Environment variable not found: DATABASE_URL`, the env var
> isn't set (or not applied to the Production environment) — add it and redeploy.

> **No API key?** On the **Run test** page, leave **"Use demo provider"** checked
> to run against the built-in mock and see the full flow end to end.

> **Real Claude runs:** switch to **Claude API**, pick a model, and either paste
> an **Anthropic API key** (`sk-ant-...`) — with an optional "Save encrypted for
> reuse" — or select a previously saved key from the vault. Alternatively set
> `ANTHROPIC_API_KEY` in `.env` for a server-side default.

## Environment variables

| Variable             | Required | Description                                                        |
| -------------------- | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`       | yes      | SQLite connection string, e.g. `file:./dev.db`.                    |
| `DEFAULT_TIMEOUT_MS` | no       | Per-request timeout in ms (default `60000`).                       |
| `ANTHROPIC_API_KEY`  | no       | Optional server-side default key so users can run without pasting. |
| `KEY_VAULT_SECRET`   | prod     | 32-byte secret for the AES-256-GCM key vault (hex/base64/any string — hashed to 32 bytes). In dev, if unset, a random secret is generated once into the gitignored `.key-vault-secret` file. **Set this explicitly in production**; changing it makes previously saved keys undecryptable. |

## Key vault API

| Endpoint                | Method | Purpose                                                    |
| ----------------------- | ------ | ---------------------------------------------------------- |
| `/api/keys`             | GET    | List saved keys — `{id, label, last4}` only, never plaintext. |
| `/api/keys`             | POST   | `{label, key}` → validate, encrypt (AES-256-GCM), store.   |
| `/api/keys/:id`         | POST   | Reveal: decrypt and return plaintext once (user-initiated eye toggle). |
| `/api/keys/:id`         | DELETE | Delete the stored key.                                     |
| `/api/benchmark`        | POST   | Accepts `keyId` — the key is decrypted server-side, held in memory for the run only. |

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
  api/benchmark/route.ts   POST: run suite, stream progress via SSE, persist
  api/results/route.ts     GET run list / GET one run by id
lib/
  providers/anthropic.ts   Claude streaming client (measures TTFT, usage, stop_reason)
  providers/mock.ts        Demo provider (no key, no network)
  providers/index.ts       Provider dispatch
  models.ts                Claude model catalog + pricing (client-safe)
  tasks.ts                 The 6 benchmark tasks + heuristic checkers
  runner.ts                Runs the suite, yields progress events
  metrics.ts               Timing/stats aggregation
  scoring.ts               Sub-scores + overall score formula
  types.ts, format.ts, client.ts, db.ts
components/                ScoreGauge, MetricCard, ProgressPanel, TaskResultTable,
                           Charts, ConfigForm, ResultsDashboard
prisma/schema.prisma       BenchmarkRun + TaskResult (no API-key columns)
```

## Extending

The system is intentionally modular:

- **Add a benchmark task** — append a `BenchmarkTask` to the `TASKS` array in
  [`lib/tasks.ts`](lib/tasks.ts) with a prompt and a `check()` quality function.
  It automatically appears in runs, the dashboard, and the DB.
- **Add a model** — add an entry to `CLAUDE_MODELS` in
  [`lib/models.ts`](lib/models.ts) (id, label, pricing).
- **Add a provider** — implement a `callX(req): Promise<ModelCallResult>` under
  `lib/providers/`, then wire it into `callModel()` in
  [`lib/providers/index.ts`](lib/providers/index.ts).

## Inspecting stored results

```bash
npx prisma studio
```

Browse the `BenchmarkRun` and `TaskResult` tables — note there is **no column
for an API key** anywhere in the schema.

## Notes

- Real Claude calls stream via `client.messages.stream(...)` so time-to-first-token
  is measured accurately. Default models: Fable 5, Opus 4.8, Sonnet 5, Haiku 4.5.
- Prices in `lib/models.ts` are USD per 1M tokens and are used only to estimate
  cost from reported token usage.
