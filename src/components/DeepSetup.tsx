import { useState, useSyncExternalStore } from "react";
import { deep } from "../core/gamma/deep-runtime";
import { DEEP_MODEL, DEEP_WEIGHT_BYTES } from "../core/gamma/deep-config";
import { isExtension } from "../lib/extension";

export function DeepSetup({ busy }: { busy: boolean }) {
  const state = useSyncExternalStore(deep.subscribe, deep.getSnapshot);
  const [error, setError] = useState("");
  return (
    <section className="settings-section">
      <h3>Gamma · Deep Mode · Research preview</h3>
      <p>
        Experimental local drafts from built-in evidence or selected documents.
        Use /deep followed by a supported topic, or /deep summarize documents.
        Quotations are checked; generated explanations can still be wrong.
      </p>
      <p>
        Core is recommended for everyday use. In eight local probes, only two
        drafts passed validation; one still missed a source disagreement.
      </p>
      <p className="fine-print">
        {DEEP_MODEL}, Apache-2.0. Quantized weights:{" "}
        {DEEP_WEIGHT_BYTES.toLocaleString()} bytes (
        {(DEEP_WEIGHT_BYTES / 1048576).toFixed(1)} MiB), plus tokenizer and
        runtime assets. Downloads contact Hugging Face. CPU/WASM; allow several
        GB of working memory and substantial setup time. No conversations are
        uploaded. Core remains available without this model.
      </p>
      <p role="status">{state.detail}</p>
      {state.progress !== undefined && (
        <progress
          max={1}
          value={state.progress}
          aria-label="Deep Mode download progress"
        />
      )}
      {isExtension() && (
        <p>Website-only experiment. The extension uses Gamma Core.</p>
      )}
      <div className="settings-buttons">
        <button
          className="primary"
          disabled={
            busy ||
            isExtension() ||
            ["loading", "ready", "generating"].includes(state.state)
          }
          onClick={async () => {
            if (
              !confirm(
                "Download and initialize Gamma Deep Mode from Hugging Face? 488.4 MiB of weights plus tokenizer/runtime assets. Missing cached files may download. Processing stays on this device.",
              )
            )
              return;
            setError("");
            try {
              await deep.initialize(true);
            } catch (e) {
              if (e instanceof Error && e.name !== "AbortError")
                setError(e.message);
            }
          }}
        >
          Initialize Deep Mode
        </button>
        <button
          onClick={() => {
            deep.disable();
            setError("");
          }}
        >
          Stop and disable Deep Mode
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            if (confirm("Remove only Gamma Deep Mode’s cached model files?")) {
              try {
                await deep.remove();
                setError("");
              } catch {
                setError(
                  "Cache removal failed. Use browser site-data settings to finish.",
                );
              }
            }
          }}
        >
          Remove Deep Mode data
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="fine-print">
        Setup always requires your action. This small model is not a general
        reasoning upgrade. Drafts cannot execute tools or change settings; use
        the cited source text to verify them.
      </p>
    </section>
  );
}
