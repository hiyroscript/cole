import { knowledge } from "../../data/knowledge";
import type { Context } from "../types";
import { literal } from "./data-tools";
import { questionFrame } from "./question";
export const dimensions: Record<
  string,
  { role: string; execution: string; ai: string }
> = {
  webgpu: {
    role: "Graphics and general compute API",
    execution: "GPU through a supported adapter and runtime",
    ai: "Supports compute shaders used by compatible inference runtimes; operator and device support must be tested.",
  },
  webgl: {
    role: "Browser graphics API",
    execution: "GPU rendering pipeline and shaders",
    ai: "Some runtimes encode numerical work in graphics operations; restrictions differ from general compute.",
  },
  wasm: {
    role: "Portable sandboxed code format",
    execution: "Usually CPU, with optional SIMD/threads when supported",
    ai: "Runs CPU inference kernels and supports fallback when GPU execution is unavailable.",
  },
  "ram-storage": {
    role: "RAM holds working program data; storage retains files",
    execution: "RAM is generally volatile and faster than SSD storage",
    ai: "Model weights and working buffers must fit runtime memory; disk space is not a substitute for enough RAM.",
  },
  ssd: {
    role: "Persistent file storage",
    execution: "Nonvolatile flash with higher access latency than RAM",
    ai: "Stores model files and caches; loading still requires working memory.",
  },
  "cpu-cache": {
    role: "Small fast copies near processor cores",
    execution: "Automatic hardware-managed locality",
    ai: "Can reduce repeated CPU data-access costs; workload and access patterns matter.",
  },
};
export function comparisonMatrix(ids: string[]): string {
  const rows = ids.flatMap((id) => {
    const d = dimensions[id],
      k = knowledge.find((k) => k.id === id);
    return d && k ? [{ k, d }] : [];
  });
  if (rows.length < 2) return "";
  return (
    "\n\n### Functional comparison\n| Subject | Role | Execution / storage | Relevance to AI |\n| --- | --- | --- | --- |\n" +
    rows
      .map(
        ({ k, d }) =>
          `| ${literal(k.title)} | ${literal(d.role)} | ${literal(d.execution)} | ${literal(d.ai)} |`,
      )
      .join("\n") +
    "\n\nA backend API does not establish successful model execution. Choose using the runtime’s operator support, measured latency and memory on the actual device; retain a supported fallback."
  );
}
export function comparisonAspect(
  input: string,
  c: Context,
): string | undefined {
  const question = (questionFrame(input)?.subject ?? input)
    .trim()
    .replace(/[.!?]$/, "");
  if (
    !/^(?:how )?(?:each(?: of them)?|they) (?:relates? to|(?:is|are|can be) used (?:for|in)) (?:running )?(?:ai|inference|machine learning)(?: in (?:a |the )?browser)?$/i.test(
      question,
    )
  )
    return;
  const ids = c.comparison;
  if (!ids || ids.length < 2 || ids.some((id) => !dimensions[id])) return;
  const records = ids.map((id) => knowledge.find((k) => k.id === id)!);
  c.authoredSources = ids;
  c.sources = undefined;
  return (
    records
      .map(
        (k) =>
          `### ${k.title}: AI use\n${dimensions[k.id].ai}\n\n[Reference](${k.reference}); reviewed ${k.reviewed}.`,
      )
      .join("\n\n") +
    "\n\nThese are functional roles, not measurements. Model compatibility, available memory and measured performance determine which backend is suitable."
  );
}
export function comparisonFollowup(
  input: string,
  c: Context,
): string | undefined {
  if (
    !c.comparison?.length ||
    !/^(?:(?:which(?: one)? is (?:better for )?(?:privacy|faster|speed|memory|performance|support))|(?:what about|how about)(?: on)? (?:privacy|speed|memory|performance|support|android|ios|windows|linux|macos)|compare them|and on (?:android|ios|windows|linux|macos))[.!?]*$/i.test(
      input,
    )
  )
    return;
  const records = c.comparison
    .map((id) => knowledge.find((k) => k.id === id))
    .filter((k) => !!k);
  if (records.length < 2) return;
  const platform = input
    .match(/\b(android|ios|windows|linux|macos)\b/i)?.[1]
    ?.toLowerCase();
  if (platform) c.platform = platform;
  c.authoredSources = records.map((k) => k.id);
  c.sources = undefined;
  const relevant = /privacy/i.test(input)
    ? "Privacy depends on settings, extensions, sign-in and the sites used; these records do not establish a universal winner."
    : /android|ios/i.test(input)
      ? `Platform: ${c.platform}. Desktop capability claims do not automatically apply to mobile; check the mobile build and actual API support.`
      : "Compare the roles and constraints below against the workload you care about.";
  return `${relevant}\n\n${records.map((k) => `### ${k.title}\n${k.answer}\n\n[Reference](${k.reference}); reviewed ${k.reviewed}.`).join("\n\n")}${comparisonMatrix(records.map((k) => k.id))}`;
}
