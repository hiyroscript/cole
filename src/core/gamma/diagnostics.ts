import type { Evidence } from "../types";
import { features } from "../../lib/diagnostics";
export type Snapshot = {
  timestamp: number;
  environment: "website" | "extension";
  fields: Evidence[];
  missing: string[];
  warnings: string[];
};
export function snapshot(fields: Evidence[], extension = false): Snapshot {
  return {
    timestamp: Date.now(),
    environment: extension ? "extension" : "website",
    fields,
    missing: fields.filter((f) => f.kind === "Unavailable").map((f) => f.label),
    warnings: [
      "Browser signals do not measure system-wide RAM, CPU load, temperature, or graphics memory.",
    ],
  };
}
export function health(fields: Evidence[]) {
  const available = features();
  const lines = Object.entries(available).map(
    ([name, supported]) =>
      `- ${name}: ${supported ? "API exposed" : "API unavailable"}`,
  );
  const usage = Number(
    fields.find((f) => f.label === "Origin usage (bytes)")?.value,
  );
  const quota = Number(
    fields.find((f) => f.label === "Origin quota (bytes)")?.value,
  );
  if (quota > 0 && usage / quota > 0.9)
    lines.push(
      "- Potential concern: this origin is using over 90% of its estimated quota. Export important data before cleanup.",
    );
  if (fields.some((f) => f.label === "Online hint" && f.value === "Offline"))
    lines.push(
      "- The browser reports offline. This is not a remote reachability test.",
    );
  return (
    "### Browser capability report\n" +
    lines.join("\n") +
    "\n\nAPI presence does not guarantee successful use. For current resource use, check your operating system’s activity monitor. There is no universal browser-health score."
  );
}
export function diagnosticGroups(input: string) {
  const groups: string[] = [];
  if (/\b(my|this|check|tell me|detect)\b/.test(input)) {
    if (/browser/.test(input)) groups.push("Browser");
    if (/screen|resolution|viewport|display/.test(input))
      groups.push("Display");
    if (/device|ram|memory|processor/.test(input)) groups.push("Device");
    if (/storage|quota/.test(input)) groups.push("Storage");
  }
  return groups;
}
