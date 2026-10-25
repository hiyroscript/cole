import { useRef, useState } from "react";
import {
  importDocument,
  DOCUMENT_LIMIT,
  type LocalDocument,
} from "../core/gamma/documents";
export function DocumentImport({
  document,
  change,
  disabled,
}: {
  document?: LocalDocument;
  change: (doc?: LocalDocument) => void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  return (
    <span className="document-import">
      <input
        ref={input}
        type="file"
        hidden
        accept=".txt,.md,.json,.csv,.log"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            if (file.size > DOCUMENT_LIMIT)
              throw new Error("Choose a file no larger than 100,000 bytes.");
            const doc = importDocument(file.name, await file.text());
            change(doc);
            setError("");
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Unable to read this file.",
            );
          }
        }}
      />
      <button
        type="button"
        className="text-button"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        Import document
      </button>
      {document && (
        <>
          <span aria-live="polite"> {document.name} · local to this tab</span>
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => change(undefined)}
          >
            Remove document
          </button>
        </>
      )}
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
