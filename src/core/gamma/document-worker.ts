/// <reference lib="webworker" />
import { importDocument } from "./documents";
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = async ({ data }) => {
  try {
    if (
      typeof data?.name !== "string" ||
      (typeof data?.text !== "string" && !(data?.text instanceof ArrayBuffer))
    )
      throw Error("Invalid document input");
    const document =
      typeof data.text === "string"
        ? importDocument(data.name, data.text)
        : await (
            await import("./document-binary")
          ).parseDocumentBytes(data.name, data.text);
    scope.postMessage({ document });
  } catch (e) {
    scope.postMessage({
      error: e instanceof Error ? e.message : "Document indexing failed",
    });
  }
};
