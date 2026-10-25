import type { Context, Depth } from "../types";
export type LocalMemory = {
  version: 1;
  enabled: boolean;
  depth?: Depth;
  browser?: string;
  platform?: string;
};
const key = "gamma.memory.v1";
const allowed: Record<string, string[]> = {
  depth: ["brief", "standard", "detailed", "steps"],
  browser: ["chrome", "firefox", "safari", "edge", "brave", "opera"],
  platform: ["windows", "macos", "linux", "android", "ios"],
};
export function readMemory(): LocalMemory {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    const p = raw as LocalMemory;
    if (!p || p.version !== 1 || typeof p.enabled !== "boolean")
      return { version: 1, enabled: false };
    return {
      version: 1,
      enabled: p.enabled,
      ...Object.fromEntries(
        Object.entries(allowed)
          .filter(([k, values]) =>
            values.includes(String(p[k as keyof LocalMemory])),
          )
          .map(([k]) => [k, p[k as keyof LocalMemory]]),
      ),
    };
  } catch {
    return { version: 1, enabled: false };
  }
}
export function applyMemory(context: Context): Context {
  const p = readMemory();
  if (!p.enabled) return context;
  return {
    ...context,
    depth: context.turns === 0 ? (p.depth ?? context.depth) : context.depth,
    browser: context.browser ?? p.browser,
    platform: context.platform ?? p.platform,
  };
}
export function memoryCommand(arg: string) {
  const p = readMemory();
  const parts = arg.trim().toLowerCase().split(/\s+/);
  if (!arg.trim() || arg === "status")
    return `Local memory is ${p.enabled ? "on" : "off"}. Saved explicit preferences: ${
      Object.entries(p)
        .filter(([k]) => ["depth", "browser", "platform"].includes(k))
        .map(([k, v]) => `${k}=${v}`)
        .join(", ") || "none"
    }. It stores only supported preferences you explicitly save, separately from conversation history. Use /memory on, /memory save depth brief, /memory save browser firefox, /memory save platform windows, /memory off, or /memory clear.`;
  try {
    if (arg === "clear") {
      localStorage.removeItem(key);
      return "Saved local preferences cleared and memory disabled. Conversation history is unchanged.";
    }
    if (arg === "on" || arg === "off") {
      localStorage.setItem(
        key,
        JSON.stringify({ ...p, enabled: arg === "on" }),
      );
      return `Local memory ${arg === "on" ? "enabled" : "disabled"}. ${arg === "on" ? "Only explicitly saved supported preferences will be applied." : "Saved preferences are retained but will not be applied; /memory clear removes them."}`;
    }
    if (
      parts.length === 3 &&
      parts[0] === "save" &&
      allowed[parts[1]]?.includes(parts[2])
    ) {
      if (!p.enabled)
        return "Memory is off. Use /memory on before explicitly saving a preference.";
      localStorage.setItem(key, JSON.stringify({ ...p, [parts[1]]: parts[2] }));
      return `Saved ${parts[1]}=${parts[2]} locally. Use /memory to review, /memory save to correct, or /memory clear to remove it.`;
    }
    return "Unsupported memory input. Only depth, browser and platform values listed by /memory can be saved. Freeform or sensitive personal information is not stored as memory.";
  } catch {
    return "Local memory storage is unavailable. No preference was saved; this conversation remains usable.";
  }
}
export function clearMemory() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(key);
}
