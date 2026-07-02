"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  LockIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "./Icons";

// Server-backed API key vault.
// - Saved keys are encrypted at rest with AES-256-GCM (server-side); the UI only
//   ever lists {label, last4} and can reveal a key on explicit request.
// - Pasted keys have a show/hide eye toggle and can optionally be saved
//   (encrypted) for reuse, or used once and forgotten.

interface SavedKey {
  id: string;
  label: string;
  last4: string;
  createdAt: string;
}

export interface KeyCredentials {
  apiKey?: string;
  keyId?: string;
}

export interface ApiKeyVaultHandle {
  // Returns what the benchmark run should use: a pasted key or a saved key id.
  getCredentials: () => KeyCredentials;
}

type Mode = "saved" | "paste";

const ApiKeyVault = forwardRef<ApiKeyVaultHandle, { disabled?: boolean }>(
  function ApiKeyVault({ disabled }, ref) {
    const id = useId();
    const [mode, setMode] = useState<Mode>("paste");
    const [keys, setKeys] = useState<SavedKey[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [loadingList, setLoadingList] = useState(true);

    // Paste state
    const [draft, setDraft] = useState("");
    const [showDraft, setShowDraft] = useState(false);
    const [saveToVault, setSaveToVault] = useState(false);
    const [label, setLabel] = useState("");

    // Manage state
    const [revealedId, setRevealedId] = useState<string>("");
    const [revealedKey, setRevealedKey] = useState<string>("");
    const [confirmDeleteId, setConfirmDeleteId] = useState<string>("");
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const refresh = useCallback(async () => {
      setLoadingList(true);
      try {
        const res = await fetch("/api/keys");
        const data: SavedKey[] = await res.json();
        setKeys(data);
        if (data.length > 0) {
          setSelectedId((cur) => cur || data[0].id);
        }
      } catch {
        setError("Could not load saved keys.");
      } finally {
        setLoadingList(false);
      }
    }, []);

    useEffect(() => {
      refresh();
      return () => {
        if (revealTimer.current) clearTimeout(revealTimer.current);
      };
    }, [refresh]);

    // Default to the saved tab once keys exist.
    useEffect(() => {
      if (keys.length > 0) setMode((m) => m); // keep user's explicit choice
    }, [keys.length]);

    useImperativeHandle(
      ref,
      () => ({
        getCredentials: () => {
          if (mode === "saved" && selectedId) return { keyId: selectedId };
          if (draft.trim()) return { apiKey: draft.trim() };
          return {};
        },
      }),
      [mode, selectedId, draft],
    );

    async function saveDraft() {
      const key = draft.trim();
      if (!key) return;
      setBusy(true);
      setError("");
      setStatus("");
      try {
        const res = await fetch("/api/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, label: label.trim() || "My key" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not save the key.");
        setStatus(`Saved “${data.label}” — encrypted with AES-256-GCM.`);
        setDraft("");
        setLabel("");
        setSaveToVault(false);
        await refresh();
        setSelectedId(data.id);
        setMode("saved");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save the key.");
      } finally {
        setBusy(false);
      }
    }

    async function reveal(keyId: string) {
      if (revealedId === keyId) {
        // toggle off
        setRevealedId("");
        setRevealedKey("");
        if (revealTimer.current) clearTimeout(revealTimer.current);
        return;
      }
      setBusy(true);
      setError("");
      try {
        const res = await fetch(`/api/keys/${keyId}`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not reveal the key.");
        setRevealedId(keyId);
        setRevealedKey(data.key);
        // Auto re-mask after 12 seconds.
        if (revealTimer.current) clearTimeout(revealTimer.current);
        revealTimer.current = setTimeout(() => {
          setRevealedId("");
          setRevealedKey("");
        }, 12000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reveal the key.");
      } finally {
        setBusy(false);
      }
    }

    async function remove(keyId: string) {
      if (confirmDeleteId !== keyId) {
        setConfirmDeleteId(keyId);
        return;
      }
      setBusy(true);
      setError("");
      try {
        const res = await fetch(`/api/keys/${keyId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Could not delete the key.");
        setConfirmDeleteId("");
        if (revealedId === keyId) {
          setRevealedId("");
          setRevealedKey("");
        }
        if (selectedId === keyId) setSelectedId("");
        setStatus("Key deleted.");
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete the key.");
      } finally {
        setBusy(false);
      }
    }

    const tabClass = (active: boolean) =>
      `btn min-h-11 flex-1 px-3 text-xs font-bold uppercase tracking-wide ${
        active
          ? "bg-ink text-paper"
          : "bg-surface text-ink-soft hover:text-ink"
      }`;

    return (
      <section aria-labelledby={`${id}-title`} className="rule-strong bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2" id={`${id}-title`}>
            <KeyIcon className="h-4 w-4 text-signal-ink" />
            <span className="font-display text-sm font-bold uppercase tracking-wide text-ink">
              API key
            </span>
          </div>
          <span className="mono-label inline-flex items-center gap-1">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-ok" />
            AES-256-GCM at rest
          </span>
        </div>

        <div className="mt-3 flex border border-rule-strong p-0.5" role="tablist">
          <button
            className={tabClass(mode === "paste")}
            disabled={disabled || busy}
            onClick={() => setMode("paste")}
            role="tab"
            aria-selected={mode === "paste"}
            type="button"
          >
            Paste key
          </button>
          <button
            className={tabClass(mode === "saved")}
            disabled={disabled || busy}
            onClick={() => setMode("saved")}
            role="tab"
            aria-selected={mode === "saved"}
            type="button"
          >
            Saved keys{keys.length ? ` (${keys.length})` : ""}
          </button>
        </div>

        {mode === "paste" && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mono-label mb-1.5 block" htmlFor={`${id}-key`}>
                Anthropic API key
              </label>
              <div className="relative">
                <input
                  id={`${id}-key`}
                  aria-describedby={`${id}-hint`}
                  autoComplete="off"
                  className="font-data input pr-12 text-sm"
                  disabled={disabled || busy}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setError("");
                  }}
                  placeholder="sk-ant-…"
                  spellCheck={false}
                  type={showDraft ? "text" : "password"}
                  value={draft}
                />
                <button
                  aria-label={showDraft ? "Hide API key" : "Show API key"}
                  aria-pressed={showDraft}
                  className="icon-button absolute right-0.5 top-0.5 h-10 w-10 text-ink-soft hover:text-ink"
                  disabled={disabled || busy}
                  onClick={() => setShowDraft((v) => !v)}
                  title={showDraft ? "Hide" : "Show"}
                  type="button"
                >
                  {showDraft ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-ink-soft" id={`${id}-hint`}>
                Used server-side for this run only — never logged, never sent to the
                browser. Toggle the eye to check what you pasted.
              </p>
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-rule px-3 text-sm text-ink">
              <input
                checked={saveToVault}
                className="h-4 w-4 accent-[#FF4D00]"
                disabled={disabled || busy}
                onChange={(e) => setSaveToVault(e.target.checked)}
                type="checkbox"
              />
              <span className="flex items-center gap-1.5">
                <LockIcon className="h-3.5 w-3.5 text-ink-soft" />
                Save encrypted for reuse
              </span>
            </label>

            {saveToVault && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-40 flex-1">
                  <label className="mono-label mb-1.5 block" htmlFor={`${id}-label`}>
                    Label
                  </label>
                  <input
                    id={`${id}-label`}
                    className="input text-sm"
                    disabled={disabled || busy}
                    maxLength={60}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Personal key"
                    value={label}
                  />
                </div>
                <button
                  className="btn btn-ink px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled || busy || !draft.trim()}
                  onClick={saveDraft}
                  type="button"
                >
                  <LockIcon className="h-4 w-4" />
                  Encrypt &amp; save
                </button>
              </div>
            )}
          </div>
        )}

        {mode === "saved" && (
          <div className="mt-4">
            {loadingList ? (
              <p className="text-sm text-ink-soft">Loading…</p>
            ) : keys.length === 0 ? (
              <p className="text-sm text-ink-soft">
                No saved keys yet. Paste a key and check “Save encrypted for reuse”.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--rule)] border-t border-rule">
                {keys.map((k) => {
                  const selected = selectedId === k.id;
                  const revealed = revealedId === k.id;
                  return (
                    <li key={k.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-3">
                          <input
                            checked={selected}
                            className="h-4 w-4 accent-[#FF4D00]"
                            disabled={disabled || busy}
                            name={`${id}-saved-key`}
                            onChange={() => setSelectedId(k.id)}
                            type="radio"
                          />
                          <span className="text-sm font-semibold text-ink">{k.label}</span>
                          <span className="font-data text-xs text-ink-soft">
                            sk-ant-…{k.last4}
                          </span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            aria-label={revealed ? `Hide key ${k.label}` : `Reveal key ${k.label}`}
                            className="icon-button h-10 w-10 text-ink-soft hover:text-ink"
                            disabled={disabled || busy}
                            onClick={() => reveal(k.id)}
                            title={revealed ? "Hide" : "Reveal"}
                            type="button"
                          >
                            {revealed ? (
                              <EyeOffIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            aria-label={
                              confirmDeleteId === k.id
                                ? `Confirm delete ${k.label}`
                                : `Delete key ${k.label}`
                            }
                            className={`icon-button h-10 w-10 ${
                              confirmDeleteId === k.id
                                ? "bg-bad text-white hover:bg-bad"
                                : "text-ink-soft hover:text-bad"
                            }`}
                            disabled={disabled || busy}
                            onClick={() => remove(k.id)}
                            title={confirmDeleteId === k.id ? "Click again to confirm" : "Delete"}
                            type="button"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {confirmDeleteId === k.id && (
                        <p className="mt-1 text-xs font-semibold text-bad">
                          Click the trash again to permanently delete this key.
                        </p>
                      )}
                      {revealed && (
                        <input
                          aria-label={`Decrypted key ${k.label} (auto-hides in 12s)`}
                          className="font-data input mt-2 text-xs"
                          onFocus={(e) => e.currentTarget.select()}
                          readOnly
                          type="text"
                          value={revealedKey}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <p
          aria-live="polite"
          className={`mt-2 min-h-5 text-xs ${error ? "font-semibold text-bad" : "text-ok"}`}
        >
          {error || status}
        </p>
      </section>
    );
  },
);

export default ApiKeyVault;
