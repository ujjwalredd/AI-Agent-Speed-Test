import Link from "next/link";
import ScoreGauge from "@/components/ScoreGauge";
import Reveal from "@/components/Reveal";
import { ArrowRightIcon } from "@/components/Icons";

const TICKER_ITEMS = [
  "TTFT 312 MS",
  "91 TOK/S",
  "SCORE 87/100",
  "COST $0.0127",
  "RELIABILITY 100%",
  "6 TASKS",
  "CONSISTENCY 93%",
];

const TASKS = [
  ["01", "Factual recall", "Single-answer questions with exact expected values."],
  ["02", "Reasoning", "Logic traps that punish pattern-matching answers."],
  ["03", "Code generation", "Real functions checked for structure and signature."],
  ["04", "Summarization", "Compression with required key facts intact."],
  ["05", "Multi-step planning", "Ordered plans scored on structure and depth."],
  ["06", "Tool use", "Function-calling verified block by block."],
] as const;

const AXES = [
  ["Speed", "25 + 20", "Time to first token and tokens per second, banded against reference speeds."],
  ["Accuracy & Quality", "45", "Heuristic checkers grade every response — keywords, structure, valid tool calls."],
  ["Reliability & Consistency", "25", "Error rate plus variance across repeated runs of the same task."],
  ["Cost", "10", "Estimated dollars per run from real token usage and model pricing."],
] as const;

export default function Home() {
  return (
    <div>
      {/* Broadsheet hero — type is the identity */}
      <section className="pt-14 sm:pt-20">
        <p className="mono-label mb-6">Agent Performance Index — no. 001</p>
        <h1 className="display-hero text-ink">
          How fast
          <br />
          is your{" "}
          <span className="text-signal" style={{ color: "#FF4D00" }}>
            agent?
          </span>
        </h1>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
            Run a six-task benchmark against any Claude model — or the built-in demo —
            and get one clear score from 0 to 100. Speed, accuracy, quality,
            reliability, consistency, and cost. Measured, not guessed.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="/test"
              className="btn btn-signal px-8 py-4 text-sm font-bold uppercase tracking-wider"
            >
              Start agent test
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/compare" className="link-underline text-sm uppercase tracking-wide">
              Compare agents
            </Link>
          </div>
        </div>
      </section>

      {/* Mono stat ticker */}
      <section
        aria-hidden="true"
        className="mt-16 overflow-hidden border-y border-rule-strong py-3"
      >
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {TICKER_ITEMS.map((item) => (
                <span
                  key={`${copy}-${item}`}
                  className="font-data whitespace-nowrap px-6 text-sm font-semibold tracking-widest text-ink"
                >
                  {item}
                  <span className="ml-12 text-signal-ink">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Sample report */}
      <Reveal as="section" className="relative mt-24">
        <span aria-hidden="true" className="ghost-num absolute -top-10 right-0">
          01
        </span>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="display-title text-ink">One score. Fully explained.</h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft">
              Every axis is weighted, every weight is printed on the report, and the
              raw numbers — latency, tokens, dollars — sit right next to the score.
              No black box.
            </p>
          </div>
          <div className="rule-strong flex justify-center bg-surface py-10">
            <ScoreGauge score={87} label="Sample report" animate={false} />
          </div>
        </div>
      </Reveal>

      {/* The six tasks */}
      <Reveal as="section" className="relative mt-24">
        <span aria-hidden="true" className="ghost-num absolute -top-10 right-0">
          02
        </span>
        <h2 className="display-title text-ink">Six tasks, zero mercy.</h2>
        <ol className="mt-8 divide-y divide-[var(--rule)] border-t-2 border-rule-strong">
          {TASKS.map(([num, title, body]) => (
            <li key={num} className="grid gap-2 py-5 sm:grid-cols-[80px_240px_1fr] sm:gap-6">
              <span className="font-data text-sm font-semibold text-signal-ink">{num}</span>
              <span className="font-display text-lg font-bold uppercase tracking-tight text-ink">
                {title}
              </span>
              <span className="text-sm leading-6 text-ink-soft">{body}</span>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* Scoring axes */}
      <Reveal as="section" className="relative mt-24">
        <span aria-hidden="true" className="ghost-num absolute -top-10 right-0">
          03
        </span>
        <h2 className="display-title text-ink">The scoring formula.</h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 border-t-2 border-rule-strong pt-8 sm:grid-cols-2">
          {AXES.map(([title, weight, body]) => (
            <div key={title}>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-lg font-bold uppercase tracking-tight text-ink">
                  {title}
                </h3>
                <span className="font-data text-xs font-semibold text-signal-ink">
                  ×{weight}%
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Closing CTA */}
      <Reveal as="section" className="mt-28 border-t-2 border-rule-strong pt-12 text-center">
        <h2 className="display-hero text-ink" style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}>
          Measure it.
        </h2>
        <div className="mt-8">
          <Link
            href="/test"
            className="btn btn-ink px-10 py-4 text-sm font-bold uppercase tracking-wider"
          >
            Run the benchmark
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <p className="mono-label mt-6">No key needed — the demo provider runs instantly.</p>
      </Reveal>
    </div>
  );
}
