import { importDocument, type LocalDocument } from "./documents";
export async function indexLocalDocument(
  name: string,
  text: string,
  signal?: AbortSignal,
): Promise<LocalDocument> {
  signal?.throwIfAborted();
  if (typeof Worker === "undefined") return importDocument(name, text);
  const worker = new Worker(new URL("./document-worker.ts", import.meta.url), {
    type: "module",
  });
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      finish();
      reject(new DOMException("Document import cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      finish();
      reject(Error("Document indexing timed out. Try a smaller file."));
    }, 15000);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onerror = () => {
      finish();
      reject(
        Error("Document worker failed; try a smaller supported text file."),
      );
    };
    worker.onmessage = ({ data }) => {
      finish();
      if (data.error) reject(Error(data.error));
      else resolve(data.document);
    };
    worker.postMessage({ name, text });
  });
}
