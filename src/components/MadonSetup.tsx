import { useEffect, useSyncExternalStore } from "react";
import { madon } from "../core/madon/runtime";
import { MODEL_ID, VRAM_MB, WEIGHT_BYTES } from "../core/madon/model-config";
import { isExtension } from "../lib/extension";
export function MadonSetup({
  busy,
  switchToGamma,
}: {
  busy: boolean;
  switchToGamma: () => void;
}) {
  const state = useSyncExternalStore(madon.subscribe, madon.getSnapshot);
  useEffect(() => {
    void madon.check();
  }, []);
  const loading = ["checking", "downloading", "loading"].includes(state.state);
  return (
    <section className="madon-setup">
      <h3>Set up Madon</h3>
      <p>
        Madon runs directly on your device. Download its language model to start
        using local AI.
      </p>
      <p className="fine-print">
        Qwen3-1.7B · approximately {(WEIGHT_BYTES / 1e9).toFixed(2)} GB of
        weights, plus tokenizer and runtime files. About {Math.round(VRAM_MB)}{" "}
        MB of GPU memory estimated; actual needs may be higher. Speed and
        compatibility depend on your device.
      </p>
      <dl>
        <dt>Model</dt>
        <dd>{MODEL_ID}</dd>
        <dt>State</dt>
        <dd>{state.state}</dd>
        <dt>WebGPU</dt>
        <dd>
          {state.webgpu === undefined
            ? "Not checked"
            : state.webgpu
              ? "API available; runtime verification still required"
              : "Unavailable"}
        </dd>
        <dt>Available origin storage</dt>
        <dd>
          {state.storage === undefined
            ? "Not exposed"
            : `Approximately ${(state.storage / 1e9).toFixed(1)} GB`}
        </dd>
        <dt>Cached weights</dt>
        <dd>
          {state.cached === undefined
            ? "Not checked until setup"
            : state.cached
              ? "Reported present; files may be evicted"
              : "Not present"}
        </dd>
      </dl>
      <p role="status">{state.detail}</p>
      {loading && (
        <progress
          aria-label="Model initialization progress"
          max={1}
          value={state.progress}
        />
      )}
      {state.technical && (
        <details>
          <summary>Technical details</summary>
          <p>{state.technical}</p>
        </details>
      )}
      <p className="fine-print">
        Setup may download missing files from Hugging Face and the WebLLM model
        library host. Chats stay on this device. Cached files can be evicted;
        every initialization is explicit. Model answers can be wrong.
      </p>
      <div className="settings-buttons">
        {!loading && state.state !== "ready" && (
          <button
            className="primary"
            disabled={busy || isExtension()}
            onClick={() => void madon.initialize()}
          >
            Download and initialize
          </button>
        )}
        {loading && <button onClick={madon.unload}>Cancel setup</button>}
        <button disabled={busy || loading} onClick={madon.unload}>
          Unload model
        </button>
        <button
          disabled={busy || loading || isExtension()}
          onClick={() => {
            if (
              confirm(
                "Remove only Madon’s downloaded model assets? You will need to download them again.",
              )
            )
              void madon.remove();
          }}
        >
          Remove model data
        </button>
        <button disabled={busy} onClick={switchToGamma}>
          Switch to Gamma
        </button>
      </div>
      <p className="fine-print">
        Powered by{" "}
        <a
          href="https://huggingface.co/Qwen/Qwen3-1.7B"
          target="_blank"
          rel="noreferrer"
        >
          Qwen3 (Apache-2.0)
        </a>{" "}
        and{" "}
        <a
          href="https://github.com/mlc-ai/web-llm"
          target="_blank"
          rel="noreferrer"
        >
          WebLLM (Apache-2.0)
        </a>
        . Madon is a small local model, with limited factual reliability and
        context.
      </p>
    </section>
  );
}
