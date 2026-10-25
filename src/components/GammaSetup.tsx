import { useState, useSyncExternalStore } from "react";
import { semantic } from "../core/gamma/semantic";
import {
  KNOWLEDGE_VERSION,
  SEMANTIC_WEIGHT_BYTES,
} from "../core/gamma/semantic-config";
import { isExtension } from "../lib/extension";
export function GammaSetup({
  busy,
  enabled,
  change,
  clear,
}: {
  busy: boolean;
  enabled: boolean;
  change: (value: boolean) => void;
  clear: () => void;
}) {
  const state = useSyncExternalStore(semantic.subscribe, semantic.getSnapshot);
  const [error, setError] = useState("");
  return (
    <section className="settings-section">
      <h3>Gamma · Enhanced understanding</h3>
      <p>
        Improve question matching with a small local language-understanding
        model. Experimental; it retrieves guidance and does not generate
        answers.
      </p>
      <p className="fine-print">
        MiniLM quantized weights: {SEMANTIC_WEIGHT_BYTES.toLocaleString()} bytes
        (21.9 MiB), plus tokenizer and 20.6 MiB of runtime assets. Downloads
        contact Hugging Face. Processing stays local. CPU/WASM; no WebGPU
        required.
      </p>
      <p role="status">{state.detail}</p>
      {state.progress !== undefined && (
        <progress
          max={1}
          value={state.progress}
          aria-label="Enhanced understanding progress"
        />
      )}
      {isExtension() && (
        <p>Website-only enhancement. The extension uses built-in matching.</p>
      )}
      <div className="settings-buttons">
        <button
          className="primary"
          disabled={
            busy ||
            isExtension() ||
            state.state === "loading" ||
            state.state === "ready"
          }
          onClick={() => {
            if (
              confirm(
                "Download and initialize Gamma’s optional MiniLM model from Hugging Face? 21.9 MiB of weights plus tokenizer/runtime assets. Missing cached files may download. No conversations are sent.",
              )
            ) {
              change(true);
              semantic.initialize(true);
            }
          }}
        >
          {enabled
            ? "Initialize enhanced understanding"
            : "Enable and download enhancement"}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            semantic.disable();
            change(false);
          }}
        >
          Disable enhancement
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            if (
              confirm("Remove only Gamma’s semantic model and index cache?")
            ) {
              try {
                await semantic.remove();
                change(false);
                setError("");
              } catch {
                setError(
                  "Cache removal failed. Use browser site-data settings to finish.",
                );
              }
            }
          }}
        >
          Remove enhancement data
        </button>
        <button disabled={busy} onClick={clear}>
          Clear temporary context
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="fine-print">
        Knowledge: {KNOWLEDGE_VERSION}. Built-in matching works without setup.
        Cached assets may be evicted; initialization always requires your
        action.
      </p>
    </section>
  );
}
