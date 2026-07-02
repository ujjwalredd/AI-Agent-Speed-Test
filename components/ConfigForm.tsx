"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon, PlayIcon } from "@/components/Icons";
import { CLAUDE_MODELS } from "@/lib/models";
import type { BenchmarkConfig } from "@/lib/client";

export default function ConfigForm({
  onRun,
  disabled,
  submitLabel = "Start Agent Test",
  compact = false,
  defaults,
}: {
  onRun: (cfg: BenchmarkConfig) => void | Promise<void>;
  disabled?: boolean;
  submitLabel?: string;
  compact?: boolean;
  defaults?: Partial<BenchmarkConfig>;
}) {
  const [useMock, setUseMock] = useState(defaults?.useMock ?? true);
  const [model, setModel] = useState(defaults?.model ?? CLAUDE_MODELS[0].id);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(defaults?.systemPrompt ?? "");
  const [runsPerTask, setRunsPerTask] = useState(defaults?.runsPerTask ?? 3);
  const [thinking, setThinking] = useState(defaults?.thinking ?? false);
  const [submitting, setSubmitting] = useState(false);
  const busy = disabled || submitting;

  async function submit() {
    setSubmitting(true);
    try {
      await onRun({
        model,
        apiKey: useMock ? undefined : apiKey.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        runsPerTask,
        thinking,
        useMock,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const modeTab = (active: boolean) =>
    `btn min-h-11 flex-1 px-3 text-xs font-bold uppercase tracking-wide ${
      active ? "bg-ink text-paper" : "bg-surface text-ink-soft hover:text-ink"
    }`;

  return (
    <div className={`rule-strong bg-surface ${compact ? "p-4" : "p-5"} space-y-5`}>
      <div>
        <span className="mono-label mb-1.5 block">Provider</span>
        <div className="flex border border-rule-strong p-0.5" role="tablist">
          <button
            aria-selected={useMock}
            className={modeTab(useMock)}
            disabled={busy}
            onClick={() => setUseMock(true)}
            role="tab"
            type="button"
          >
            Demo
          </button>
          <button
            aria-selected={!useMock}
            className={modeTab(!useMock)}
            disabled={busy}
            onClick={() => setUseMock(false)}
            role="tab"
            type="button"
          >
            Claude API
          </button>
        </div>
        {useMock && (
          <p className="mt-1.5 text-xs leading-5 text-ink-soft">
            No key needed — synthetic but realistic numbers to explore the flow.
          </p>
        )}
      </div>

      {!useMock && (
        <>
          <Field label="Model">
            <select
              className="input text-sm"
              disabled={busy}
              onChange={(e) => setModel(e.target.value)}
              value={model}
            >
              {CLAUDE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — ${m.inputPerM}/${m.outputPerM} per 1M
                </option>
              ))}
            </select>
          </Field>

          <Field label="Anthropic API key">
            <div className="relative">
              <input
                autoComplete="off"
                className="input pr-12 text-sm"
                disabled={busy}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-…"
                spellCheck={false}
                type={showKey ? "text" : "password"}
                value={apiKey}
              />
              <button
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="icon-button absolute right-1 top-1/2 h-9 min-h-9 w-9 min-w-9 -translate-y-1/2 text-ink-soft hover:text-ink"
                disabled={busy}
                onClick={() => setShowKey((v) => !v)}
                title={showKey ? "Hide" : "Show"}
                type="button"
              >
                {showKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
              <LockIcon className="h-3.5 w-3.5" />
              Sent over HTTPS, used for this run only, never saved.
            </p>
          </Field>

          <Field label="System prompt" hint="Optional. Applied to every benchmark task.">
            <textarea
              className="input min-h-24 resize-y text-sm"
              disabled={busy}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Keep responses concise and verify assumptions."
              value={systemPrompt}
            />
          </Field>

          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border border-rule px-3 text-sm font-medium text-ink">
            <span>Adaptive thinking (slower, higher quality)</span>
            <input
              checked={thinking}
              className="h-4 w-4 accent-[#FF4D00]"
              disabled={busy}
              onChange={(e) => setThinking(e.target.checked)}
              type="checkbox"
            />
          </label>
        </>
      )}

      <Field
        label={`Runs per task: ${runsPerTask}`}
        hint="Higher values improve consistency scoring."
      >
        <input
          aria-label="Runs per task"
          className="w-full accent-[#FF4D00]"
          disabled={busy}
          max={5}
          min={1}
          onChange={(e) => setRunsPerTask(Number(e.target.value))}
          type="range"
          value={runsPerTask}
        />
        <div aria-hidden="true" className="mt-2 grid grid-cols-5 gap-1">
          {[1, 2, 3, 4, 5].map((v) => (
            <span
              key={v}
              className={`h-1 ${v <= runsPerTask ? "bg-signal" : "bg-ink/10"}`}
            />
          ))}
        </div>
      </Field>

      <button
        className="btn btn-signal min-h-12 w-full px-5 text-sm font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy}
        onClick={submit}
        type="button"
      >
        <PlayIcon className="h-4 w-4" />
        {busy ? "Running…" : submitLabel}
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mono-label mb-1.5 block">{label}</span>
      {children}
      {hint && <div className="mt-1.5 text-xs leading-5 text-ink-soft">{hint}</div>}
    </div>
  );
}
