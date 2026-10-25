export const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const stop = new Set(
  "a an the my i me you your is are am do does can could would please to of in on for how what which why it this that with have using tell about".split(
    " ",
  ),
);
const synonyms: Record<string, string> = {
  browsr: "browser",
  broswer: "browser",
  laggy: "slow",
  lagging: "slow",
  sluggish: "slow",
  speed: "performance",
  faster: "slow",
  ram: "memory",
  crashing: "crash",
  freezing: "frozen",
  internet: "network",
  wifi: "wifi",
  private: "privacy",
  secure: "security",
  safety: "security",
};
export const tokens = (text: string) =>
  normalize(text)
    .split(" ")
    .filter((t) => t && !stop.has(t))
    .map((t) => synonyms[t] ?? t);
export function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        row[j] + 1,
        row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return row[b.length];
}
