import { importDocument, type LocalDocument } from "./documents";
export const BINARY_DOCUMENT_LIMIT = 2_000_000;
export async function parseDocumentBytes(
  name: string,
  buffer: ArrayBuffer,
): Promise<LocalDocument> {
  if (buffer.byteLength > BINARY_DOCUMENT_LIMIT)
    throw Error("PDF and DOCX files must be at most 2,000,000 bytes.");
  const bytes = new Uint8Array(buffer),
    extension = name.toLowerCase().split(".").at(-1);
  if (extension === "pdf")
    return (await import("./document-pdf")).parsePdf(name, bytes);
  if (extension === "docx")
    return (await import("./document-docx")).parseDocx(name, bytes);
  return importDocument(
    name,
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  );
}
