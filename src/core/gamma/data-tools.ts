export const literal = (s: string) =>
  s.replace(/[\\`*_{}\[\]()<>#+.!|~-]/g, "\\$&");
export type Statistics = {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  populationDeviation: number;
  sampleDeviation: number | null;
};
export function statistics(values: number[]): Statistics {
  if (
    !values.length ||
    values.length > 10000 ||
    values.some((n) => !Number.isFinite(n) || Math.abs(n) > 1e12)
  )
    throw Error("Use 1–10,000 finite numbers with magnitude at most 10^12.");
  let mean = 0,
    m2 = 0,
    sum = 0;
  values.forEach((n, i) => {
    sum += n;
    const d = n - mean;
    mean += d / (i + 1);
    m2 += d * (n - mean);
  });
  const sorted = [...values].sort((a, b) => a - b),
    mid = Math.floor(sorted.length / 2);
  return {
    count: values.length,
    sum,
    mean,
    median:
      sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    min: sorted[0],
    max: sorted.at(-1)!,
    populationDeviation: Math.sqrt(Math.max(0, m2 / values.length)),
    sampleDeviation:
      values.length > 1
        ? Math.sqrt(Math.max(0, m2 / (values.length - 1)))
        : null,
  };
}
export function numberList(input: string): number[] {
  if (!/^[\d\s,.+eE\-]+$/.test(input))
    throw Error(
      "Provide numbers separated by commas or spaces; thousands separators are not supported.",
    );
  const parts = input.trim().split(/[,\s]+/);
  if (
    parts.some((p) => !/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(p))
  )
    throw Error("Invalid numeric value.");
  return parts.map(Number);
}
const n = (v: number) => String(Number(v.toPrecision(12)));
export function statisticsText(input: string): string {
  const s = statistics(numberList(input));
  return `Calculated locally from ${s.count} supplied values.\n\n| Statistic | Value |\n| --- | ---: |\n${Object.entries(
    s,
  )
    .map(
      ([key, v]) =>
        `| ${key} | ${v === null ? "Unavailable for one value" : n(v)} |`,
    )
    .join(
      "\n",
    )}\n\nPopulation deviation uses n; sample deviation uses n−1. These describe the supplied sample, not a causal or population inference.`;
}
// Strict bounded CSV state machine. Quoted commas/newlines and doubled quotes
// are supported; formula-looking cells remain inert strings.
export function parseCSV(input: string): string[][] {
  if (input.length > 100000) throw Error("CSV exceeds 100,000 characters.");
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    closed = false;
  const field = () => {
    row.push(value);
    value = "";
    closed = false;
    if (row.length > 256) throw Error("CSV exceeds 256 columns.");
  };
  const line = () => {
    field();
    rows.push(row);
    row = [];
    if (rows.length > 5000) throw Error("CSV exceeds 5,000 rows.");
  };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else value += c;
      continue;
    }
    if (c === ",") {
      field();
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      line();
      continue;
    }
    if (closed) throw Error("Unexpected text after a closing CSV quote.");
    if (c === '"') {
      if (value) throw Error("A CSV quote must start a field.");
      quoted = true;
    } else value += c;
  }
  if (quoted) throw Error("CSV has an unclosed quoted field.");
  if (value || row.length || closed) line();
  return rows;
}
export function csvAnalysis(input: string): string {
  const rows = parseCSV(input),
    header = rows[0] ?? [],
    data = rows.slice(1);
  const irregular = data
    .map((r, i) => (r.length !== header.length ? i + 2 : 0))
    .filter(Boolean);
  const summaries = header.map((label, column) => {
    const cells = data.map((r) => r[column] ?? "");
    const present = cells.filter((c) => c.trim());
    const numeric = present.filter((c) =>
      /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(c.trim()),
    );
    let summary = `${present.length} nonempty; ${cells.length - present.length} missing`;
    if (numeric.length === present.length && numeric.length) {
      const s = statistics(numeric.map(Number));
      summary += `; numeric mean ${n(s.mean)}, median ${n(s.median)}, range ${n(s.min)}–${n(s.max)}`;
    }
    return `- ${literal(label || `Column ${column + 1}`)}: ${summary}.`;
  });
  return `Local CSV analysis: ${data.length} data rows; ${header.length} columns. Header is the first row.\n${irregular.length ? `Inconsistent field counts at rows: ${irregular.slice(0, 20).join(", ")}.` : "All rows have the header field count."}\n\n${summaries.join("\n")}\n\nValues are supplied data, not independently verified. Formula-like cells are text and are never evaluated.`;
}
export function textAnalysis(input: string): string {
  const points = [...input];
  const words = input.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
  return `Local text counts: ${words.length} words; ${points.length} Unicode code points; ${input.length} UTF-16 code units; ${new TextEncoder().encode(input).length} UTF-8 bytes; ${input.split(/\r?\n/).length} lines.\n\nWords use letter/number groups. Code points are not necessarily displayed grapheme clusters.`;
}
export function textDifference(input: string): string {
  const value: unknown = JSON.parse(input);
  const d = value as { before?: unknown; after?: unknown };
  if (!d || typeof d.before !== "string" || typeof d.after !== "string")
    throw Error('Use JSON with string fields "before" and "after".');
  const before = d.before.split(/\r?\n/),
    after = d.after.split(/\r?\n/);
  if (before.length > 1000 || after.length > 1000)
    throw Error("Compare at most 1,000 lines per text.");
  const counts = (lines: string[]) => {
    const m = new Map<string, number>();
    for (const l of lines) m.set(l, (m.get(l) ?? 0) + 1);
    return m;
  };
  const a = counts(before),
    b = counts(after),
    removed: string[] = [],
    added: string[] = [];
  for (const [line, count] of a)
    for (let i = 0; i < count - (b.get(line) ?? 0); i++) removed.push(line);
  for (const [line, count] of b)
    for (let i = 0; i < count - (a.get(line) ?? 0); i++) added.push(line);
  return `Local line comparison: ${removed.length} removed occurrences; ${added.length} added occurrences. ${d.before === d.after ? "Texts are identical." : "Texts differ."}\n\n${removed
    .slice(0, 20)
    .map((l) => `- Removed: ${literal(l)}`)
    .concat(added.slice(0, 20).map((l) => `- Added: ${literal(l)}`))
    .join(
      "\n",
    )}\n\nThis compares line occurrences, not edit order or semantic meaning; reordered lines can have zero additions/removals.`;
}
export type LogicalInput = {
  facts: string[];
  rules: { if: string[]; then: string }[];
  query?: string;
};
export function deduce(input: string): string {
  const data: unknown = JSON.parse(input);
  const d = data as LogicalInput;
  const atom = (s: unknown): s is string =>
    typeof s === "string" && s.trim().length > 0 && s.length <= 120;
  if (
    !d ||
    !Array.isArray(d.facts) ||
    d.facts.length > 32 ||
    !d.facts.every(atom) ||
    !Array.isArray(d.rules) ||
    d.rules.length > 32 ||
    !d.rules.every(
      (r) =>
        r &&
        Array.isArray(r.if) &&
        r.if.length > 0 &&
        r.if.length <= 8 &&
        r.if.every(atom) &&
        atom(r.then),
    ) ||
    (d.query !== undefined && !atom(d.query))
  )
    throw Error(
      "Use JSON facts (≤32 strings), rules (≤32 {if: string[], then: string}), and an optional query. Each statement is at most 120 characters.",
    );
  const proven = new Map(
    d.facts.map((f) => [f, { premises: [] as string[], rule: -1 }]),
  );
  for (let pass = 0; pass < 32; pass++) {
    let changed = false;
    d.rules.forEach((r, i) => {
      if (!proven.has(r.then) && r.if.every((p) => proven.has(p))) {
        proven.set(r.then, { premises: r.if, rule: i });
        changed = true;
      }
    });
    if (!changed) break;
  }
  return `Deduction from your explicit premises; premises are not independently verified. No contraposition or assumption that an unproved statement is false.\n\n${[...proven].map(([statement, proof]) => `- ${literal(statement)} — ${proof.rule < 0 ? "supplied premise" : `rule ${proof.rule + 1}, using ${proof.premises.map(literal).join("; ")}`}`).join("\n")}\n\n${d.query ? `Query: ${literal(d.query)}. ${proven.has(d.query) ? "Supported by the supplied premises/rules." : "Not established by the supplied premises/rules."}` : "All reachable conclusions are listed."}`;
}
