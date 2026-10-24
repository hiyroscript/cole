import type { Evidence } from "../core/types";
export function identify(ua: string) {
  const rules: [string, RegExp][] = [
    ["Edge", /(?:Edg|EdgiOS|EdgA)\/([\d.]+)/],
    ["Opera", /(?:OPR|OPiOS)\/([\d.]+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
    ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  for (const [family, re] of rules) {
    const m = ua.match(re);
    if (m) return { family, version: m[1] };
  }
  return { family: "Unknown", version: "Unavailable" };
}
export function platform(ua: string) {
  return /iPad|iPhone|iPod/.test(ua)
    ? "iOS / iPadOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Macintosh|Mac OS/.test(ua)
          ? "macOS (iPad desktop mode can look similar)"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown";
}
export async function diagnose(): Promise<Evidence[]> {
  if (typeof navigator === "undefined") return [];
  const n = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      effectiveType?: string;
      rtt?: number;
      downlink?: number;
      saveData?: boolean;
    };
    brave?: { isBrave: () => Promise<boolean> };
  };
  const browser = identify(n.userAgent);
  try {
    if (await n.brave?.isBrave()) browser.family = "Brave";
  } catch {
    /* optional signal */
  }
  const facts: Evidence[] = [];
  const add = (
    group: Evidence["group"],
    label: string,
    value: unknown,
    kind: Evidence["kind"] = "Observed",
  ) =>
    facts.push({
      group,
      label,
      value:
        value === undefined || value === null ? "Not exposed" : String(value),
      kind: value === undefined || value === null ? "Unavailable" : kind,
    });
  add("Browser", "Browser family", browser.family, "Estimated");
  add("Browser", "Reported version", browser.version, "Estimated");
  add("Browser", "Language", n.language);
  add("Browser", "Languages", n.languages?.join(", "));
  add("Browser", "Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  add("Device", "Platform", platform(n.userAgent), "Estimated");
  add(
    "Device",
    "Device category",
    /Mobile|Android|iPhone/.test(n.userAgent)
      ? "Mobile hint"
      : "Desktop / tablet hint",
    "Estimated",
  );
  add("Device", "Logical processors", n.hardwareConcurrency, "Estimated");
  add("Device", "Approximate memory (GB)", n.deviceMemory, "Estimated");
  add("Device", "Maximum touch points", n.maxTouchPoints);
  add("Display", "Screen (CSS pixels)", `${screen.width} × ${screen.height}`);
  add("Display", "Viewport (CSS pixels)", `${innerWidth} × ${innerHeight}`);
  add("Display", "Device pixel ratio", devicePixelRatio);
  add("Display", "Color depth", screen.colorDepth);
  add("Display", "Fine pointer", matchMedia("(pointer: fine)").matches);
  add(
    "Display",
    "System dark theme",
    matchMedia("(prefers-color-scheme: dark)").matches,
  );
  add(
    "Display",
    "Reduced motion",
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  add(
    "Network",
    "Online hint",
    n.onLine ? "Online (reachability not tested)" : "Offline",
  );
  add(
    "Network",
    "Effective connection type",
    n.connection?.effectiveType,
    "Estimated",
  );
  add("Network", "Round-trip hint (ms)", n.connection?.rtt, "Estimated");
  add("Network", "Downlink hint (Mbps)", n.connection?.downlink, "Estimated");
  add("Network", "Data saver", n.connection?.saveData);
  try {
    const s = await n.storage?.estimate();
    add("Storage", "Origin usage (bytes)", s?.usage, "Estimated");
    add("Storage", "Origin quota (bytes)", s?.quota, "Estimated");
    add("Storage", "Persistent storage", await n.storage?.persisted());
  } catch {
    add("Storage", "Storage estimate", undefined);
  }
  for (const name of [
    "geolocation",
    "notifications",
    "camera",
    "microphone",
  ] as PermissionName[]) {
    try {
      const p = await n.permissions.query({ name });
      add(
        "Permissions",
        name,
        p.state,
        p.state === "prompt" ? "Requires permission" : "Observed",
      );
    } catch {
      add("Permissions", name, undefined);
    }
  }
  return facts;
}
export function features() {
  return {
    IndexedDB: typeof indexedDB !== "undefined",
    "Service worker": "serviceWorker" in navigator,
    "Storage estimate": !!navigator.storage?.estimate,
    "Clipboard write": !!navigator.clipboard?.writeText,
    "Permission queries": !!navigator.permissions?.query,
    "Secure context": isSecureContext,
    WebAssembly: typeof WebAssembly !== "undefined",
  };
}
