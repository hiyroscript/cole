import { importDocument, type LocalDocument } from "./documents";
export async function indexLocalDocument(
  name: string,
  text: string | ArrayBuffer,
  signal?: AbortSignal,
): Promise<LocalDocument> {
  signal?.throwIfAborted();
  if (typeof Worker === "undefined") {
    if (typeof text !== "string")
      throw Error("Binary document parsing requires a browser worker.");
    return importDocument(name, text);
  }
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
      else if (
        data.document &&
        typeof data.document.name === "string" &&
        typeof data.document.text === "string" &&
        Array.isArray(data.document.lines)
      )
        resolve(data.document);
      else reject(Error("Invalid document worker response."));
    };
    worker.postMessage({ name, text }, typeof text === "string" ? [] : [text]);
  });
}
