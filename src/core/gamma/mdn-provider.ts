import type { Source } from "../madon/sources";
export const compatibilityTopics: Record<
  string,
  { path: string; keys: string[] }
> = {
  webgpu: { path: "api/GPU.json", keys: ["api", "GPU"] },
  webgl: {
    path: "api/WebGLRenderingContext.json",
    keys: ["api", "WebGLRenderingContext"],
  },
  webassembly: {
    path: "javascript/builtins/WebAssembly.json",
    keys: ["javascript", "builtins", "WebAssembly"],
  },
  "service worker": {
    path: "api/ServiceWorker.json",
    keys: ["api", "ServiceWorker"],
  },
  indexeddb: { path: "api/IDBFactory.json", keys: ["api", "IDBFactory"] },
};
export type CompatibilitySnapshot = {
  revision: string;
  updatedAt: string;
  support: Record<string, string>;
};
const browsers = [
  "chrome",
  "firefox",
  "safari",
  "edge",
  "chrome_android",
  "firefox_android",
  "safari_ios",
  "webview_android",
];
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function version(value: unknown): string {
  if (value === true) return "supported; version unspecified";
  if (value === false) return "not supported";
  if (value === null || value === undefined) return "unknown";
  if (typeof value === "string" && value.length <= 40) return value;
  throw Error("Invalid compatibility version.");
}
export function compatibilitySupport(
  data: unknown,
  keys: string[],
): Record<string, string> {
  let current = data;
  for (const key of keys) {
    if (!object(current)) throw Error("Invalid compatibility data.");
    current = current[key];
  }
  const compat = object(current) ? current.__compat : undefined;
  if (!object(compat) || !object(compat.support))
    throw Error("Compatibility record missing.");
  return Object.fromEntries(
    browsers.map((browser) => {
      const raw = compat.support as Record<string, unknown>,
        value = raw[browser];
      const statements = Array.isArray(value) ? value : [value];
      if (statements.length > 8)
        throw Error("Too many compatibility alternatives.");
      const text = statements
        .map((s) => {
          if (typeof s === "string")
            return `data alias: ${s.slice(0, 40)}; inspect source`;
          if (!object(s)) return "unknown";
          const qualifications = [
            s.version_removed ? `removed ${version(s.version_removed)}` : "",
            s.partial_implementation ? "partial implementation" : "",
            s.flags ? "requires flags/preferences" : "",
            s.prefix ? "prefixed implementation" : "",
            s.alternative_name ? "alternative name" : "",
            s.notes ? "source includes qualifications" : "",
          ].filter(Boolean);
          const added =
            typeof s.version_added === "string"
              ? `added ${version(s.version_added)}`
              : version(s.version_added);
          return `${added}${qualifications.length ? `; ${qualifications.join("; ")}` : ""}`;
        })
        .join(" / ");
      return [browser, text];
    }),
  );
}
async function json(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    credentials: "omit",
    referrerPolicy: "no-referrer",
    redirect: "error",
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw Error(`MDN compatibility provider unavailable (${response.status}).`);
  if (Number(response.headers.get("content-length") ?? 0) > 250000)
    throw Error("Compatibility response is too large.");
  const reader = response.body?.getReader();
  if (!reader) throw Error("Compatibility response has no body.");
  let size = 0,
    text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 250000) throw Error("Compatibility response is too large.");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  return JSON.parse(text);
}
export function compatibilityDiff(
  current: CompatibilitySnapshot,
  previous: CompatibilitySnapshot,
): string[] {
  return browsers.flatMap((browser) =>
    current.support[browser] === previous.support[browser]
      ? []
      : [
          `${browser}: ${previous.support[browser]} → ${current.support[browser]}`,
        ],
  );
}
export async function retrieveCompatibility(
  query: string,
  signal: AbortSignal,
): Promise<Source[]> {
  const topic = query
      .replace(/^mdn\s+/i, "")
      .trim()
      .toLowerCase(),
    spec = Object.hasOwn(compatibilityTopics, topic)
      ? compatibilityTopics[topic]
      : undefined;
  if (!spec)
    throw Error(
      "Use /research mdn followed by webgpu, webgl, webassembly, service worker or indexeddb.",
    );
  const commits = await json(
    `https://api.github.com/repos/mdn/browser-compat-data/commits?path=${encodeURIComponent(spec.path)}&per_page=2`,
    signal,
  );
  if (!Array.isArray(commits) || !commits.length)
    throw Error("No compatibility revisions found.");
  const snapshots: CompatibilitySnapshot[] = [];
  for (const item of commits.slice(0, 2)) {
    if (
      !object(item) ||
      typeof item.sha !== "string" ||
      !/^[a-f0-9]{40}$/.test(item.sha) ||
      !object(item.commit) ||
      !object(item.commit.committer)
    )
      throw Error("Invalid compatibility revision.");
    const date = item.commit.committer.date;
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T/.test(date) ||
      !Number.isFinite(Date.parse(date))
    )
      throw Error("Invalid revision date.");
    const data = await json(
      `https://raw.githubusercontent.com/mdn/browser-compat-data/${item.sha}/${spec.path}`,
      signal,
    );
    snapshots.push({
      revision: item.sha,
      updatedAt: date,
      support: compatibilitySupport(data, spec.keys),
    });
  }
  const changes = snapshots[1]
    ? compatibilityDiff(snapshots[0], snapshots[1])
    : undefined;
  return snapshots.map((snapshot, i) => ({
    title: `MDN ${topic} compatibility — ${i ? "previous file revision" : "latest file revision"}`,
    url: `https://github.com/mdn/browser-compat-data/blob/${snapshot.revision}/${spec.path}`,
    updatedAt: snapshot.updatedAt,
    text: `${Object.entries(snapshot.support)
      .map(([browser, support]) => `${browser}: ${support}.`)
      .join(
        "\n",
      )}\n${i ? "Previous file revision for comparison." : changes?.length ? "Changed top-level support fields:\n" + changes.join("\n") : changes ? "No change in the checked top-level support fields between these two file revisions. Child APIs, notes and other fields were not compared." : "A previous revision was unavailable; no change is established."}\nCommunity-maintained compatibility evidence, not a successful feature probe on your device.`,
  }));
}
