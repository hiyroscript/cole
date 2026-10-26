import { knowledge } from "../../data/knowledge";
import { rank, confidence } from "./retrieval";
import { observe } from "./observations";
import { mergeFacts, type CaseState } from "./case-state";
import type { Context, Knowledge, Response } from "../types";
// Editorial relationships are links to relevant evidence, not proof of causation.
export const reasoningLinks: Record<
  string,
  {
    id: string;
    kind: "related" | "possible-cause" | "requires" | "alternative";
  }[]
> = {
  acceleration: [
    { id: "cpu-gpu", kind: "related" },
    { id: "video", kind: "related" },
    { id: "crash", kind: "possible-cause" },
  ],
  video: [
    { id: "acceleration", kind: "related" },
    { id: "cpu", kind: "related" },
    { id: "media-codec-container", kind: "related" },
  ],
  slow: [
    { id: "background", kind: "possible-cause" },
    { id: "ram", kind: "related" },
    { id: "acceleration", kind: "related" },
  ],
  freeze: [
    { id: "slow", kind: "related" },
    { id: "crash", kind: "related" },
  ],
  website: [
    { id: "dns", kind: "possible-cause" },
    { id: "certificate", kind: "possible-cause" },
    { id: "offline-network", kind: "related" },
  ],
  webgpu: [
    { id: "webgl", kind: "alternative" },
    { id: "cpu-gpu", kind: "requires" },
  ],
  cookies: [
    { id: "logout", kind: "related" },
    { id: "cache", kind: "related" },
  ],
};
export function relatedRecords(
  id: string,
  limit = 4,
): { record: Knowledge; path: string[] }[] {
  const byId = new Map(knowledge.map((k) => [k.id, k]));
  const seen = new Set([id]);
  const queue = [{ id, path: [id] }];
  const output: { record: Knowledge; path: string[] }[] = [];
  while (queue.length && output.length < limit) {
    const current = queue.shift()!;
    if (current.path.length > 2) continue;
    const record = byId.get(current.id);
    if (!record) continue;
    const next = [
      ...(reasoningLinks[current.id] ?? []),
      ...(record.relationships ?? []),
      ...record.related.map((id) => ({ id, kind: "related" })),
    ];
    for (const link of next) {
      const target = byId.get(link.id);
      if (!target || seen.has(link.id)) continue;
      seen.add(link.id);
      const path = [...current.path, `${link.kind}: ${link.id}`];
      output.push({ record: target, path });
      queue.push({ id: link.id, path: [...current.path, link.id] });
      if (output.length >= limit) break;
    }
  }
  return output;
}
function applicable(k: Knowledge, c: Context) {
  const p = c.platform
    ?.replace(/windows.*/, "Windows")
    .replace(/macos/, "macOS")
    .replace(/ubuntu|linux/, "Linux");
  return !p || !k.platforms?.length || k.platforms.includes(p);
}
export function evidenceAnswer(query: string, c: Context): Response {
  const matches = rank(query);
  const accepted = ["high", "moderate"].includes(confidence(matches));
  const root = accepted
    ? matches[0].record
    : !query.trim() && c.intent
      ? knowledge.find((k) => k.id === c.intent)
      : undefined;
  if (!root)
    return {
      text: "Name a supported topic so I can connect its authored evidence. For example: /reason hardware acceleration.",
      context: c,
    };
  const records = [
    { record: root, path: [root.id] },
    ...relatedRecords(root.id),
  ].filter((r) => applicable(r.record, c));
  c.intent = root.id;
  c.authoredSources = records.map((r) => r.record.id);
  c.sources = undefined;
  const observed = c.case?.facts
    .filter((f) => !f.contradicted)
    .map(
      (f) =>
        `- ${f.kind === "user" ? "User-provided" : "Evidence"}: ${f.key} = ${f.value}`,
    )
    .join("\n");
  return {
    text:
      (observed ? `### Supplied information\n${observed}\n\n` : "") +
      "### Connected authored evidence\n" +
      records
        .map(
          ({ record, path }) =>
            `**${record.title}**\n${record.answer}\n\n[Reference](${record.reference}); reviewed ${record.reviewed}. Connection: ${path.join(" → ")}.`,
        )
        .join("\n\n") +
      "\n\nThese relationships identify relevant explanations; they do not prove a cause. A controlled comparison that changes the symptom would strengthen or weaken the corresponding hypothesis.",
    context: c,
    analysis: records.map(
      (r) => `Authored: ${r.record.id}; ${r.path.join(" → ")}`,
    ),
  };
}
function target(query: string, c: Context) {
  const u = observe(query),
    matches = rank(query);
  if (["high", "moderate"].includes(confidence(matches)))
    return matches[0].record;
  const id = u.symptoms.includes("video")
    ? "video"
    : u.symptoms.includes("freeze")
      ? "freeze"
      : u.symptoms.includes("crash")
        ? "crash"
        : u.symptoms.includes("slow")
          ? "slow"
          : u.symptoms.includes("network")
            ? "website"
            : c.intent;
  return knowledge.find((k) => k.id === id);
}
export function plan(query: string, c: Context): Response {
  const u = observe(query),
    root = target(query, c);
  if (!c.case || query !== c.case.goal) {
    const platform = u.facts.findLast((f) => f.key === "platform");
    if (platform) c.platform = platform.value;
  }
  if (!root)
    return {
      text: "What symptom should I plan checks for? Include the affected application, what fails, and what still works.",
      context: c,
    };
  if (!applicable(root, c))
    return {
      text: "That guidance targets a different operating system. Please confirm the device before planning its checks.",
      context: c,
    };
  if (c.case && query !== c.case.goal) {
    c.pausedCases = [...(c.pausedCases ?? []), structuredClone(c.case)].slice(
      -3,
    );
    c.case = undefined;
  }
  const state: CaseState = c.case ?? {
    version: 1,
    goal: query.slice(0, 500),
    facts: [],
    sources: [],
    checks: [],
    corrections: [],
  };
  if (!c.case) mergeFacts(state, u.facts);
  mergeFacts(
    state,
    u.constraints.map((constraint, i) => ({
      key: `constraint:${i}`,
      value: constraint,
      kind: "user" as const,
    })),
  );
  if (!c.case && u.affectedBrowser) c.browser = u.affectedBrowser;
  for (const hypothesis of u.hypothesis)
    mergeFacts(state, [
      {
        key: `hypothesis:${hypothesis}`,
        value: "possible, not confirmed",
        kind: "hypothesis",
      },
    ]);
  const sources = [
    root,
    ...relatedRecords(root.id).map((r) => r.record),
  ].filter((k) => applicable(k, c));
  state.sources = [
    ...new Set([...state.sources, ...sources.map((k) => k.id)]),
  ].slice(-12);
  const already = new Set(state.checks.map((k) => k.id));
  const checks = sources
    .flatMap((k, sourceIndex) =>
      k.steps.map((text, i) => ({
        id: `${k.id}:${i}`,
        text,
        source: k.id,
        score:
          100 -
          sourceIndex * 12 -
          i * 3 +
          (/compare|temporary|record|check|save/.test(text.toLowerCase())
            ? 10
            : 0) -
          (/reset|delete|clear|remove|disable/.test(text.toLowerCase())
            ? 40
            : 0),
      })),
    )
    .filter(
      (check) =>
        !already.has(check.id) &&
        !state.facts.some(
          (f) =>
            !f.contradicted &&
            f.key.startsWith("constraint:") &&
            /without|avoid|dont|do not|cannot|cant/i.test(f.value) &&
            ["clear", "delete", "reset", "install", "disable", "remove"].some(
              (action) =>
                f.value.toLowerCase().includes(action) &&
                check.text.toLowerCase().includes(action),
            ),
        ) &&
        !/factory reset|delete all|bypass|format (?:the|your)|disable (?:security|antivirus)/i.test(
          check.text,
        ),
    );
  if (
    u.workingBrowsers.length &&
    u.affectedBrowser &&
    !already.has("contrast-profile")
  )
    checks.push({
      id: "contrast-profile",
      text: `Compare the same affected page in a temporary ${u.affectedBrowser} profile without added extensions. Keep the original profile and data. Your reported working ${u.workingBrowsers.join(" / ")} is a useful control, not proof of a GPU fault.`,
      source: root.id,
      score: 130,
    });
  const best = checks.sort((a, b) => b.score - a.score)[0];
  c.case = state;
  c.goal = state.goal;
  c.intent = root.id;
  c.authoredSources = state.sources;
  c.sources = undefined;
  if (!best) {
    state.pending = undefined;
    return {
      text: "The available distinct reversible checks are exhausted. Keep the recorded results and contact the application or device support team; no cause or fix has been verified.",
      context: c,
    };
  }
  state.checks.push({ ...best, outcome: "suggested" });
  state.checks = state.checks.slice(-24);
  state.pending = best.id;
  const text = `### Next reversible check\n${best.text}\n\nWhy this check: it compares the reported failure against a controlled condition before considering broader changes.\n\nEvidence: user-reported symptoms; authored guidance [${root.title}](${root.reference}), reviewed ${root.reviewed}. No system hardware measurements were taken.\n\nReport “that helped”, “that didn’t help”, or “skip that check”. A changed result updates the next recommendation; a failed test does not by itself prove the remaining cause.`;
  return {
    text,
    context: c,
    followups: [
      "That helped",
      "That didn’t help",
      "Skip that check",
      "/summary",
    ],
    analysis: [
      `Goal: ${state.goal}`,
      `Selected ${best.id}; bounded rule priority ${best.score}, not a probability.`,
      `Source IDs: ${state.sources.join(", ")}`,
    ],
  };
}
export function continuePlan(input: string, c: Context): Response | undefined {
  const state = c.case;
  if (!state?.pending || state.resolved) return;
  const outcome =
    /^(?:that |it )?(?:didn.t help|did not help|failed|still broken|no)(?:[.!?]|$)/i.test(
      input,
    )
      ? "failed"
      : /^(?:that |it )?(?:helped|worked|resolved|yes)(?:[.!?]|$)/i.test(input)
        ? "helped"
        : /^skip (?:that|the) check/i.test(input)
          ? "skipped"
          : undefined;
  if (!outcome) return;
  const check = state.checks.find((k) => k.id === state.pending);
  if (check) check.outcome = outcome;
  state.pending = undefined;
  if (outcome === "helped") {
    state.resolved = true;
    return {
      text: "You reported that the check helped. The recorded change is evidence of improvement, not proof of a single underlying cause. Keep the original settings noted and monitor the same workload.",
      context: c,
    };
  }
  return plan(state.goal, c);
}
export function resumePlan(c: Context): Response {
  const paused = c.pausedCases?.pop();
  if (!paused)
    return { text: "No suspended diagnostic task is available.", context: c };
  if (c.case) c.pausedCases = [...(c.pausedCases ?? []), c.case].slice(-3);
  c.case = paused;
  c.goal = paused.goal;
  const check = paused.checks.find((k) => k.id === paused.pending);
  if (check)
    return {
      text: `Resumed: ${paused.goal}\n\nPending check: ${check.text}\n\nReport whether it helped, failed, or should be skipped.`,
      context: c,
    };
  return plan(paused.goal, c);
}
export function caseSummary(c: Context) {
  const state = c.case;
  if (!state)
    return `Current topic: ${c.topic ?? c.intent ?? "none"}. Stated browser: ${c.browser ?? "unknown"}. Stated OS: ${c.platform ?? "unknown"}. Authored workflow: ${c.diagnosis?.id ?? "none"}. Completed observations: ${c.diagnosis?.history.length ?? 0}.`;
  return `### Troubleshooting report\nGoal: ${state.goal}\nSuspended tasks: ${(c.pausedCases ?? []).map((s) => s.goal).join("; ") || "none"}. Use /plan resume to switch to the most recent.\n\n### User-provided facts and hypotheses\n${
    state.facts
      .filter((f) => !f.contradicted)
      .map((f) => `- ${f.kind}: ${f.key} = ${f.value}`)
      .join("\n") || "No facts recorded."
  }\n\n### Checks and reported results\n${state.checks.map((k) => `- ${k.outcome}: ${k.text}`).join("\n")}\n\n### Corrections\n${state.corrections.join("\n") || "None."}\n\nStatus: ${state.resolved ? "user reported improvement" : "cause remains unverified"}. Use the existing conversation export to save this report.`;
}
