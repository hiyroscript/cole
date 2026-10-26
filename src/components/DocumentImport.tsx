import { useRef, useState, useEffect } from "react";
import { DOCUMENT_LIMIT, type LocalDocument } from "../core/gamma/documents";
import { indexLocalDocument } from "../core/gamma/document-runtime";
export function DocumentImport({
  documents,
  change,
  disabled,
}: {
  documents: LocalDocument[];
  change: (docs: LocalDocument[]) => void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null),
    active = useRef<AbortController | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => () => active.current?.abort(), []);
  return (
    <span className="document-import">
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept=".txt,.md,.json,.csv,.log"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!files.length) return;
          active.current?.abort();
          const controller = new AbortController();
          active.current = controller;
          setBusy(true);
          setError("");
          try {
            if (files.length > 4) throw Error("Select at most four documents.");
            const next: LocalDocument[] = [];
            for (const file of files) {
              if (file.size > DOCUMENT_LIMIT)
                throw Error("Choose files no larger than 100,000 bytes each.");
              const text = await file.text();
              controller.signal.throwIfAborted();
              next.push(
                await indexLocalDocument(file.name, text, controller.signal),
              );
            }
            controller.signal.throwIfAborted();
            change(next);
          } catch (err) {
            if (!controller.signal.aborted)
              setError(
                err instanceof Error
                  ? err.message
                  : "Unable to read documents.",
              );
          } finally {
            if (active.current === controller) {
              active.current = null;
              setBusy(false);
            }
          }
        }}
      />
      <button
        type="button"
        className="text-button"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
      >
        Import document
      </button>
      {busy && (
        <>
          <span role="status">Indexing selected documents…</span>
          <button
            type="button"
            className="text-button"
            onClick={() => active.current?.abort()}
          >
            Cancel import
          </button>
        </>
      )}
      {documents.map((doc, i) => (
        <span key={i}>
          <span aria-live="polite"> {doc.name} · local to this tab</span>
          <button
            type="button"
            className="text-button"
            disabled={disabled || busy}
            onClick={() => change(documents.filter((_, index) => index !== i))}
          >
            Remove document {documents.length > 1 ? i + 1 : ""}
          </button>
        </span>
      ))}
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
