import { workflow } from "../core/gamma/workflows";
import { normalizeModel } from "./legacy";
import { validSource } from "../core/madon/sources";
import {
  emptyContext,
  type Conversation,
  type Preferences,
} from "../core/types";
export const defaults: Preferences = {
  model: "gamma",
  webSources: false,
  enhanced: false,
  theme: "light",
  thinking: "auto",
  name: "",
  device: "",
};
export function preferences(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem("varek.preferences.v1") ?? "{}");
    return {
      ...defaults,
      model: p.model === "madon" ? "madon" : "gamma",
      webSources: p.webSources === true,
      enhanced: p.enhanced === true,
      theme: ["light", "dark", "system"].includes(p.theme) ? p.theme : "light",
      thinking: ["auto", "on", "off"].includes(p.thinking)
        ? p.thinking
        : "auto",
      name: typeof p.name === "string" ? p.name.slice(0, 80) : "",
      device: typeof p.device === "string" ? p.device.slice(0, 1000) : "",
    };
  } catch {
    return { ...defaults };
  }
}
export function savePreferences(p: Preferences) {
  localStorage.setItem("varek.preferences.v1", JSON.stringify(p));
}
function strings(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length < 1000 &&
    value.every((v) => typeof v === "string")
  );
}
function validDiagnosis(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.node === "string" &&
    !!workflow(d.id)?.nodes.some((n) => n.id === d.node) &&
    Array.isArray(d.history) &&
    d.history.length <= 24 &&
    d.history.every(
      (h) =>
        h &&
        typeof h.node === "string" &&
        typeof h.answer === "string" &&
        h.answer.length <= 200,
    ) &&
    (d.outcome === undefined ||
      ["resolved", "escalated"].includes(String(d.outcome)))
  );
}
function validContext(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    ["brief", "standard", "detailed", "steps"].includes(String(c.depth)) &&
    Number.isFinite(c.updated) &&
    Number.isFinite(c.turns) &&
    strings(c.attempted) &&
    (c.intent === undefined || typeof c.intent === "string") &&
    (c.browser === undefined || typeof c.browser === "string") &&
    (c.pending === undefined || strings(c.pending)) &&
    (c.platform === undefined || typeof c.platform === "string") &&
    ["topic", "goal", "lastAction", "detectedBrowser"].every(
      (key) => c[key] === undefined || typeof c[key] === "string",
    ) &&
    (c.sources === undefined ||
      (Array.isArray(c.sources) &&
        c.sources.length <= 2 &&
        c.sources.every(validSource))) &&
    (c.diagnosis === undefined || validDiagnosis(c.diagnosis)) &&
    (c.flow === undefined ||
      (!!c.flow &&
        typeof c.flow === "object" &&
        typeof (c.flow as { id: unknown }).id === "string" &&
        [0, 1].includes((c.flow as { step: number }).step)))
  );
}
export function validConversation(c: unknown): c is Conversation {
  if (!c || typeof c !== "object") return false;
  const x = c as Conversation;
  return (
    typeof x.id === "string" &&
    typeof x.title === "string" &&
    typeof x.pinned === "boolean" &&
    Number.isFinite(x.updated) &&
    Array.isArray(x.messages) &&
    validContext(x.context) &&
    x.messages.every(
      (m) =>
        m &&
        typeof m.id === "string" &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.text === "string" &&
        (m.model === undefined || ["gamma", "madon"].includes(m.model)) &&
        (m.modelVersion === undefined || typeof m.modelVersion === "string") &&
        (m.stopped === undefined || typeof m.stopped === "boolean") &&
        (m.failure === undefined || typeof m.failure === "string") &&
        (m.sources === undefined ||
          (Array.isArray(m.sources) &&
            m.sources.length <= 2 &&
            m.sources.every(validSource))) &&
        (m.analysis === undefined || strings(m.analysis)) &&
        (m.followups === undefined || strings(m.followups)) &&
        (m.contextBefore === undefined || validContext(m.contextBefore)) &&
        (m.evidence === undefined ||
          (Array.isArray(m.evidence) &&
            m.evidence.every(
              (f) =>
                f &&
                typeof f.label === "string" &&
                typeof f.value === "string" &&
                [
                  "Observed",
                  "Estimated",
                  "User-provided",
                  "Unavailable",
                  "Requires permission",
                ].includes(f.kind) &&
                [
                  "Browser",
                  "Device",
                  "Display",
                  "Network",
                  "Storage",
                  "Permissions",
                ].includes(f.group),
            ))),
    )
  );
}
function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("varek", 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains("conversations"))
        r.result.createObjectStore("conversations", { keyPath: "id" });
    };
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction("conversations", mode),
        r = action(t.objectStore("conversations"));
      t.oncomplete = () => resolve(r.result);
      t.onabort = () =>
        reject(t.error ?? new Error("Storage transaction aborted"));
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}
export function normalizeConversation(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const x = value as Record<string, unknown>;
  const context = (c: unknown) => {
    if (!c || typeof c !== "object") return c;
    const next = { ...c } as Record<string, unknown>;
    const f = next.flow as { id?: unknown; step?: unknown } | undefined;
    if (f && (typeof f.id !== "string" || ![0, 1].includes(f.step as number)))
      delete next.flow;
    if (next.diagnosis && !validDiagnosis(next.diagnosis))
      delete next.diagnosis;
    return next;
  };
  return {
    ...x,
    context: context(x.context),
    messages: Array.isArray(x.messages)
      ? x.messages.map((m) =>
          m && typeof m === "object"
            ? {
                ...m,
                ...(m.model === undefined
                  ? {}
                  : { model: normalizeModel(m.model) }),
                ...(m.contextBefore === undefined
                  ? {}
                  : { contextBefore: context(m.contextBefore) }),
              }
            : m,
        )
      : x.messages,
  };
}
export const loadConversations = async () =>
  ((await transaction("readonly", (s) => s.getAll())) as unknown[])
    .map(normalizeConversation)
    .filter(validConversation)
    .map((c) => ({ ...c, context: { ...emptyContext(), ...c.context } }));
export const putConversation = (c: Conversation) =>
  transaction("readwrite", (s) => s.put(c));
export const deleteConversation = (id: string) =>
  transaction("readwrite", (s) => s.delete(id));
export const clearConversations = () =>
  transaction("readwrite", (s) => s.clear());
export function download(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
