/// <reference lib="webworker" />
import { importDocument } from "./documents";
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = ({ data }) => {
  try {
    if (typeof data?.name !== "string" || typeof data?.text !== "string")
      throw Error("Invalid document input");
    scope.postMessage({ document: importDocument(data.name, data.text) });
  } catch (e) {
    scope.postMessage({
      error: e instanceof Error ? e.message : "Document indexing failed",
    });
  }
};
