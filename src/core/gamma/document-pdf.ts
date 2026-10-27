import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerURL from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  extractedDocument,
  DOCUMENT_LIMIT,
  type LocalDocument,
} from "./documents";

export async function parsePdf(
  name: string,
  bytes: Uint8Array,
): Promise<LocalDocument> {
  if (new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-")
    throw Error("Invalid PDF signature.");
  // Supplying a packaged nested worker avoids PDF.js's window-only auto
  // detection and prevents its fallback worker from sharing our message port.
  const parserWorker = new Worker(workerURL, { type: "module" });
  GlobalWorkerOptions.workerPort = parserWorker;
  let task: ReturnType<typeof getDocument> | undefined;
  try {
    task = getDocument({
      data: bytes,
      useSystemFonts: false,
      disableFontFace: true,
      useWorkerFetch: false,
      useWasm: false,
      isOffscreenCanvasSupported: false,
      maxImageSize: 1,
      stopAtErrors: true,
      disableAutoFetch: true,
      disableStream: true,
    });
    task.onPassword = () => {
      void task?.destroy();
    };
    const pdf = await task.promise;
    if (pdf.numPages > 40) throw Error("PDFs are limited to 40 pages.");
    const pages: { text: string; page: number }[] = [];
    let total = 0;
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n),
        content = await page.getTextContent();
      let text = "",
        lastY: number | undefined;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = item.transform[5];
        if (
          lastY !== undefined &&
          Math.abs(y - lastY) > 2 &&
          !text.endsWith("\n")
        )
          text += "\n";
        text += item.str + (item.hasEOL ? "\n" : " ");
        lastY = y;
        if (total + text.length > DOCUMENT_LIMIT)
          throw Error("Extracted PDF text exceeds 100,000 characters.");
      }
      total += text.length;
      pages.push({ text: text.trim(), page: n });
      page.cleanup();
    }
    if (!total)
      throw Error(
        "No PDF text was found. Scanned pages require OCR, which is not available here.",
      );
    return extractedDocument(
      name,
      "pdf",
      pages,
      "PDF text only; citations use physical page numbers and extracted line numbers. Reading order and complex layouts may differ from the rendered page. Images, scripts, forms, attachments and links are not executed or fetched.",
    );
  } finally {
    await task?.destroy().catch(() => {});
    parserWorker.terminate();
    GlobalWorkerOptions.workerPort = null;
  }
}
