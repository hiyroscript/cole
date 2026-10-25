import { knowledge } from "../../data/knowledge";
import type { Knowledge } from "../types";
export const packCatalog = [
  {
    id: "programming",
    title: "Programming",
    description:
      "JavaScript, Python, algorithms, validation, testing and accessible web development",
    load: () => import("../../data/packs/programming"),
  },
  {
    id: "math-science",
    title: "Mathematics and science",
    description:
      "Percentages, probability, statistics, measurement, energy and scientific reasoning",
    load: () => import("../../data/packs/math-science"),
  },
  {
    id: "systems",
    title: "Computer systems",
    description:
      "Processes, memory, storage, permissions, backups and device fundamentals",
    load: () => import("../../data/packs/systems"),
  },
  {
    id: "digital-work",
    title: "Everyday technical work",
    description:
      "Documents, spreadsheets, formats, time zones, source evaluation and useful bug reports",
    load: () => import("../../data/packs/digital-work"),
  },
] as const;
const key = "gamma.knowledge.v1";
const loaded = new Set<string>();
const pending = new Map<string, Promise<Knowledge[]>>();
function saved(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter(
          (v): v is string =>
            typeof v === "string" && packCatalog.some((p) => p.id === v),
        )
      : [];
  } catch {
    return [];
  }
}
function persist(ids: string[]) {
  if (typeof localStorage !== "undefined")
    localStorage.setItem(key, JSON.stringify(ids));
}
export async function loadPack(
  id: string,
  remember = false,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const pack = packCatalog.find((p) => p.id === id);
  if (!pack)
    throw new Error(
      "Unknown knowledge pack. Use /knowledge for supported packs.",
    );
  if (!loaded.has(id)) {
    if (!pending.has(id))
      pending.set(
        id,
        pack
          .load()
          .then((module) => module.pack)
          .finally(() => pending.delete(id)),
      );
    const records = await pending.get(id);
    signal?.throwIfAborted();
    if (remember) persist([...new Set([...saved(), id])]);
    const known = new Set(knowledge.map((k) => k.id));
    for (const record of records ?? [])
      if (!known.has(record.id)) knowledge.push({ ...record, pack: id });
    loaded.add(id);
  }
  signal?.throwIfAborted();
  if (remember) {
    persist([...new Set([...saved(), id])]);
    const { semantic } = await import("./semantic");
    if (semantic.getSnapshot().state !== "disabled") semantic.disable();
  }
}
export async function restorePacks(signal?: AbortSignal) {
  for (const id of saved()) {
    try {
      await loadPack(id, false, signal);
    } catch {
      signal?.throwIfAborted();
    }
  }
}
export async function removePack(id: string) {
  const pack = packCatalog.find((p) => p.id === id);
  if (!pack) throw new Error("Unknown pack.");
  await pending.get(id);
  persist(saved().filter((v) => v !== id));
  for (let i = knowledge.length - 1; i >= 0; i--)
    if (knowledge[i].pack === id) knowledge.splice(i, 1);
  loaded.delete(id);
  // Module objects cannot be unloaded from the JS module registry. Delete only
  // optional pack responses, never shell assets, history or model weights.
  if (typeof caches !== "undefined")
    for (const cacheName of await caches.keys()) {
      if (!cacheName.startsWith("varek-")) continue;
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys())
        if (new URL(request.url).pathname.includes(`/assets/pack-${id}-`))
          await cache.delete(request);
    }
}
export async function knowledgeCommand(arg: string, signal?: AbortSignal) {
  const [action, id, ...extra] = arg.trim().split(/\s+/);
  if (extra.length)
    return "Use /knowledge, /knowledge install PACK, or /knowledge remove PACK.";
  try {
    if (action === "install" && id) {
      await loadPack(id, true, signal);
      return `Installed ${id} for local use. This explicit request loads the static pack from Cole's origin. No conversation is sent. Cached offline use depends on browser storage; /knowledge remove ${id} removes its selection and cached chunk.`;
    }
    if (action === "remove" && id) {
      await removePack(id);
      return `Removed ${id} from retrieval and its cached chunk. Reload to release module memory. Saved answers remain in their conversations.`;
    }
    if (arg.trim() && arg.trim() !== "status")
      return "Use /knowledge, /knowledge install PACK, or /knowledge remove PACK.";
    return (
      `Built-in: 700 authored records. Loaded: ${knowledge.length}. Optional domain packs load only after your explicit install request.\n\n` +
      packCatalog
        .map(
          (p) =>
            `- **${p.id}**: ${p.description}. ${loaded.has(p.id) ? "Installed" : "Not loaded"}.`,
        )
        .join("\n")
    );
  } catch (e) {
    signal?.throwIfAborted();
    return `Knowledge pack unavailable: ${e instanceof Error ? e.message : "storage or connection failure"}. Built-in guidance remains available.`;
  }
}
export function installedRecords(): Knowledge[] {
  return knowledge;
}
