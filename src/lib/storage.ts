import {
  emptyContext,
  type Conversation,
  type Preferences,
} from "../core/types";
export const defaults: Preferences = {
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
export const loadConversations = async () =>
  ((await transaction("readonly", (s) => s.getAll())) as unknown[])
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
