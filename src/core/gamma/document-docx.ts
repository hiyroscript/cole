import { Unzip, UnzipInflate } from "fflate";
import { SaxesParser } from "saxes";
import {
  DOCUMENT_LIMIT,
  extractedDocument,
  type LocalDocument,
} from "./documents";

const MAX_ENTRIES = 256,
  MAX_EXPANDED = 8_000_000,
  MAX_XML = 1_000_000;
const WORD = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// Inspect the complete directory before inflating any entry. Only the main
// text XML is inflated; media, links, macros and embedded packages are ignored.
export function inspectDocx(
  bytes: Uint8Array,
): Map<string, { size: number; crc: number }> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (
      view.getUint32(i, true) === 0x06054b50 &&
      i + 22 + view.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  if (end < 0) throw Error("Invalid DOCX ZIP directory.");
  const count = view.getUint16(end + 10, true),
    size = view.getUint32(end + 12, true),
    offset = view.getUint32(end + 16, true);
  if (
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    view.getUint16(end + 8, true) !== count ||
    count > MAX_ENTRIES ||
    offset + size !== end
  )
    throw Error("Unsupported split, ZIP64 or oversized DOCX archive.");
  const entries = new Map<string, { size: number; crc: number }>();
  let cursor = offset,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      throw Error("Invalid DOCX entry.");
    const flags = view.getUint16(cursor + 8, true),
      method = view.getUint16(cursor + 10, true),
      compressed = view.getUint32(cursor + 20, true),
      expanded = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true),
      extra = view.getUint16(cursor + 30, true),
      comment = view.getUint16(cursor + 32, true),
      local = view.getUint32(cursor + 42, true);
    const next = cursor + 46 + nameLength + extra + comment;
    if (next > end || local + 30 > offset)
      throw Error("Invalid DOCX entry bounds.");
    const name = new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLength),
    );
    total += expanded;
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      expanded === 0xffffffff ||
      compressed === 0xffffffff ||
      expanded > MAX_EXPANDED ||
      total > MAX_EXPANDED ||
      expanded > Math.max(1, compressed) * 200
    )
      throw Error("DOCX encryption or expansion limit is unsupported.");
    if (
      !name ||
      name.startsWith("/") ||
      name.includes("\\") ||
      name.split("/").includes("..") ||
      entries.has(name)
    )
      throw Error("Unsafe or duplicate DOCX entry name.");
    if (
      view.getUint32(local, true) !== 0x04034b50 ||
      view.getUint16(local + 6, true) !== flags ||
      view.getUint16(local + 8, true) !== method
    )
      throw Error("DOCX directory/header mismatch.");
    const localNameLength = view.getUint16(local + 26, true),
      localExtra = view.getUint16(local + 28, true),
      start = local + 30 + localNameLength + localExtra;
    if (
      start + compressed > offset ||
      new TextDecoder().decode(
        bytes.subarray(local + 30, local + 30 + localNameLength),
      ) !== name
    )
      throw Error("Invalid DOCX entry location.");
    entries.set(name, {
      size: expanded,
      crc: view.getUint32(cursor + 16, true),
    });
    cursor = next;
  }
  if (
    cursor !== end ||
    !entries.has("[Content_Types].xml") ||
    !entries.has("word/document.xml")
  )
    throw Error("This ZIP is not a supported DOCX document.");
  if (entries.get("word/document.xml")!.size > MAX_XML)
    throw Error("DOCX text XML exceeds 1,000,000 bytes.");
  return entries;
}

export function docxText(xml: string): string {
  if (xml.length > MAX_XML) throw Error("DOCX text XML exceeds its limit.");
  const parser = new SaxesParser({ xmlns: true });
  let inText = 0,
    paragraph = "",
    heading = 0,
    result = "";
  const append = (text: string) => {
    paragraph += text;
    if (paragraph.length + result.length > DOCUMENT_LIMIT)
      throw Error("Extracted document exceeds 100,000 characters.");
  };
  parser.on("doctype", () => {
    throw Error("DTD and entity declarations are not supported.");
  });
  parser.on("opentag", (tag) => {
    if (tag.uri !== WORD) return;
    if (tag.local === "t") inText++;
    if (tag.local === "pStyle") {
      const value = Object.values(tag.attributes).find(
        (a) => a.local === "val",
      )?.value;
      heading = Number(value?.match(/^Heading([1-6])$/i)?.[1] ?? 0);
    }
    if (tag.local === "tab") append("\t");
    if (tag.local === "br" || tag.local === "cr") append("\n");
  });
  parser.on("text", (text) => {
    if (inText) append(text);
  });
  parser.on("cdata", (text) => {
    if (inText) append(text);
  });
  parser.on("closetag", (tag) => {
    if (tag.uri !== WORD) return;
    if (tag.local === "t") inText--;
    if (tag.local === "p") {
      result += (heading ? "#".repeat(heading) + " " : "") + paragraph + "\n";
      paragraph = "";
      heading = 0;
    }
  });
  parser.write(xml).close();
  return result + paragraph;
}

export function parseDocx(name: string, bytes: Uint8Array): LocalDocument {
  const entries = inspectDocx(bytes);
  const parts: Uint8Array[] = [];
  let total = 0,
    done = false,
    failure: Error | undefined;
  const seen = new Set<string>();
  const unzip = new Unzip((file) => {
    if (!entries.has(file.name) || seen.has(file.name))
      throw Error(
        "DOCX local entry is missing from its directory or duplicated.",
      );
    seen.add(file.name);
    if (file.name !== "word/document.xml") return;
    file.ondata = (error, data, final) => {
      if (error) {
        failure = error;
        file.terminate();
        return;
      }
      total += data.length;
      if (total > MAX_XML || total > entries.get(file.name)!.size) {
        failure = Error("DOCX actual expansion exceeds declared bounds.");
        file.terminate();
        return;
      }
      parts.push(data);
      if (final) done = true;
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < bytes.length; offset += 1024) {
    unzip.push(
      bytes.subarray(offset, offset + 1024),
      offset + 1024 >= bytes.length,
    );
    if (failure) throw failure;
  }
  if (!done || total !== entries.get("word/document.xml")!.size)
    throw Error("Truncated DOCX text entry.");
  const xml = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    xml.set(part, offset);
    offset += part.length;
  }
  if (crc32(xml) !== entries.get("word/document.xml")!.crc)
    throw Error("DOCX text checksum failed.");
  const text = docxText(new TextDecoder("utf-8", { fatal: true }).decode(xml));
  return extractedDocument(
    name,
    "docx",
    [{ text }],
    "DOCX body text only. Headings use paragraph styles; page layout, headers, drawings and tracked-change interpretation are not reconstructed. Macros, relationships and embedded objects are never executed or fetched.",
  );
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
