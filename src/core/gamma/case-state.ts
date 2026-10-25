export type Fact = {
  key: string;
  value: string;
  kind: "user" | "observed" | "authored" | "computed" | "hypothesis";
  source?: string;
  contradicted?: boolean;
};
export type CaseState = {
  version: 1;
  goal: string;
  facts: Fact[];
  sources: string[];
  checks: {
    id: string;
    text: string;
    source: string;
    outcome: "suggested" | "failed" | "helped" | "skipped";
  }[];
  corrections: string[];
  pending?: string;
  resolved?: boolean;
};
export function validCase(value: unknown): value is CaseState {
  if (!value || typeof value !== "object") return false;
  const c = value as CaseState;
  return (
    c.version === 1 &&
    typeof c.goal === "string" &&
    c.goal.length <= 500 &&
    Array.isArray(c.facts) &&
    c.facts.length <= 32 &&
    c.facts.every(
      (f) =>
        f &&
        typeof f.key === "string" &&
        f.key.length <= 80 &&
        typeof f.value === "string" &&
        f.value.length <= 500 &&
        ["user", "observed", "authored", "computed", "hypothesis"].includes(
          f.kind,
        ) &&
        (f.source === undefined ||
          (typeof f.source === "string" && f.source.length <= 500)) &&
        (f.contradicted === undefined || typeof f.contradicted === "boolean"),
    ) &&
    Array.isArray(c.checks) &&
    c.checks.length <= 24 &&
    c.checks.every(
      (k) =>
        k &&
        typeof k.id === "string" &&
        k.id.length <= 100 &&
        typeof k.text === "string" &&
        k.text.length <= 2000 &&
        typeof k.source === "string" &&
        k.source.length <= 100 &&
        ["suggested", "failed", "helped", "skipped"].includes(k.outcome),
    ) &&
    Array.isArray(c.sources) &&
    c.sources.length <= 12 &&
    c.sources.every((s) => typeof s === "string" && s.length <= 100) &&
    Array.isArray(c.corrections) &&
    c.corrections.length <= 16 &&
    c.corrections.every((s) => typeof s === "string" && s.length <= 500) &&
    (c.pending === undefined ||
      (typeof c.pending === "string" && c.pending.length <= 100)) &&
    (c.resolved === undefined || typeof c.resolved === "boolean")
  );
}
export function mergeFacts(state: CaseState, facts: Fact[]) {
  for (const fact of facts) {
    const existing = state.facts.find(
      (f) => f.key === fact.key && !f.contradicted,
    );
    if (existing?.value === fact.value) continue;
    if (existing) {
      existing.contradicted = true;
      state.corrections.push(`${fact.key}: ${existing.value} → ${fact.value}`);
    }
    state.facts.push(fact);
  }
  state.facts = state.facts.slice(-32);
  state.corrections = state.corrections.slice(-16);
}
