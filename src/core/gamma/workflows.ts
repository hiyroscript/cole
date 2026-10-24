import { scenarios } from "./scenarios";
import { flows } from "../flows";
import type { Context, Response } from "../types";
export type Branch = { label: string; pattern: string; next: string };
export type Node = {
  id: string;
  kind:
    | "question"
    | "recommendation"
    | "confirmation"
    | "completion"
    | "escalation";
  text: string;
  reason?: string;
  branches: Branch[];
};
export type Workflow = { id: string; start: string; nodes: Node[] };
const yes = "^(yes|yeah|yep|done|it worked|that helped|fixed|resolved)\\b";
const no =
  "^(no|nope|not yet|still|that didnt|didnt|it didnt|did not|try something else)\\b";
const success: Node = {
  id: "done",
  kind: "completion",
  text: "That check helped. Keep the working configuration and monitor whether the issue returns.",
  branches: [],
};
// Legacy flows acquire stable node IDs. Historical numeric steps remain supported.
export const workflows: Workflow[] = flows.map((f) => ({
  id: f.id,
  start: "scope",
  nodes: [
    {
      id: "scope",
      kind: "question",
      text: f.question,
      branches: [
        { label: "Yes", pattern: yes, next: "yes" },
        { label: "No", pattern: no, next: "no" },
      ],
    },
    {
      id: "yes",
      kind: f.id === "heat" ? "escalation" : "recommendation",
      text: f.yes,
      reason:
        "Your answer narrowed the affected environment; this is a proposed check, not a measured cause.",
      branches:
        f.id === "heat"
          ? []
          : [{ label: "Continue", pattern: ".*", next: "confirm" }],
    },
    {
      id: "no",
      kind: "recommendation",
      text: f.no,
      reason:
        "Start with the broader environment because the first condition was not confirmed.",
      branches: [{ label: "Continue", pattern: ".*", next: "confirm" }],
    },
    {
      id: "confirm",
      kind: "confirmation",
      text: f.next,
      branches: [
        { label: "Yes", pattern: yes, next: "done" },
        { label: "No", pattern: no, next: "escalate" },
      ],
    },
    success,
    { id: "escalate", kind: "escalation", text: f.escalation, branches: [] },
  ],
}));
const slow = workflows.find((f) => f.id === "slow")!;
slow.nodes[0].text =
  "Where are you noticing the slowdown: one website, every website, several tabs, or video playback?";
slow.nodes[0].branches = [
  {
    label: "One website",
    pattern: "one|single|mostly|youtube|^yes",
    next: "site",
  },
  { label: "Every website", pattern: "every|all|^no", next: "tabs" },
  { label: "Several tabs", pattern: "tabs|pages|many|bunch", next: "tabs" },
  {
    label: "Video playback",
    pattern: "video|watch|playback|stream",
    next: "video",
  },
  { label: "Not sure", pattern: "not sure|dont know|unknown", next: "observe" },
];
slow.nodes = slow.nodes.filter((n) => !["yes", "no"].includes(n.id));
slow.nodes.push(
  {
    id: "site",
    kind: "question",
    text: "Focus on that site. Is it slow during video playback, or also when reading and scrolling?",
    branches: [
      {
        label: "Only videos",
        pattern: "video|watch|playback|only",
        next: "video",
      },
      {
        label: "Reading and scrolling",
        pattern: "reading|scroll|both|all|no",
        next: "profile",
      },
    ],
  },
  {
    id: "video",
    kind: "recommendation",
    text: "Compare a lower playback resolution on the same video. Note whether buffering or dropped frames change; this separates transfer demand from decoding load without changing security settings.",
    reason:
      "The issue occurs during playback; a lower resolution is a reversible way to compare transfer and decode demand.",
    branches: [{ label: "Continue", pattern: ".*", next: "video-confirm" }],
  },
  {
    id: "video-confirm",
    kind: "confirmation",
    text: "Did lowering playback resolution help?",
    branches: [
      { label: "Yes", pattern: yes, next: "done" },
      { label: "No", pattern: no, next: "profile" },
    ],
  },
  {
    id: "tabs",
    kind: "recommendation",
    text: "Save work. Open the browser task manager, identify a busy tab, and pause its work or close it only if it has no unsaved changes. Varek cannot read per-tab CPU or RAM use.",
    reason:
      "Tab workload is user-reported; the task manager can supply measurements the website cannot access.",
    branches: [{ label: "Continue", pattern: ".*", next: "tabs-confirm" }],
  },
  {
    id: "tabs-confirm",
    kind: "confirmation",
    text: "Did reducing tab workload help?",
    branches: [
      { label: "Yes", pattern: yes, next: "done" },
      { label: "No", pattern: no, next: "profile" },
    ],
  },
  {
    id: "profile",
    kind: "recommendation",
    text: "Compare the affected page in a temporary profile without added extensions. Keep your original profile and its data. If the problem remains, record the page and browser version for browser support.",
    reason:
      "The prior check did not establish a cause; a separate profile tests extension and profile differences without deleting data.",
    branches: [{ label: "Continue", pattern: ".*", next: "confirm" }],
  },
  {
    id: "observe",
    kind: "question",
    text: "Compare an unrelated text page and a video page. Which is slow?",
    branches: [
      { label: "Video", pattern: "video", next: "video" },
      { label: "Both", pattern: "both|all|text", next: "tabs" },
    ],
  },
);
for (const scenario of scenarios) {
  workflows.push({
    id: scenario.id,
    start: "scope",
    nodes: [
      {
        id: "scope",
        kind: "question",
        text: scenario.question,
        branches: scenario.choices.map(([label, pattern], i) => ({
          label,
          pattern,
          next: `check-${i}`,
        })),
      },
      ...scenario.choices.map(([, , text], i): Node => ({
        id: `check-${i}`,
        kind: "recommendation",
        text,
        reason: "Your observation selects a reversible check for this symptom.",
        branches: [{ label: "Continue", pattern: ".*", next: "confirm-first" }],
      })),
      {
        id: "confirm-first",
        kind: "confirmation",
        text: "Did that check resolve the issue?",
        branches: [
          { label: "Yes", pattern: yes, next: "done" },
          { label: "No", pattern: no, next: "second" },
        ],
      },
      {
        id: "second",
        kind: "recommendation",
        text: scenario.second,
        reason:
          "The first check did not resolve the symptom; compare the adjacent layer before escalating.",
        branches: [
          { label: "Continue", pattern: ".*", next: "confirm-second" },
        ],
      },
      {
        id: "confirm-second",
        kind: "confirmation",
        text: "Did the second check help?",
        branches: [
          { label: "Yes", pattern: yes, next: "done" },
          { label: "No", pattern: no, next: "escalate" },
        ],
      },
      success,
      {
        id: "escalate",
        kind: "escalation",
        text: scenario.escalation,
        branches: [],
      },
    ],
  });
}
export function workflow(id: string) {
  return workflows.find((f) => f.id === id);
}
export function begin(id: string, context: Context): Response | undefined {
  const f = workflow(id);
  if (!f) return;
  context.diagnosis = { id, node: f.start, history: [] };
  context.flow = undefined;
  return present(context);
}
function present(context: Context): Response {
  const state = context.diagnosis!,
    f = workflow(state.id)!;
  let node = f.nodes.find((n) => n.id === state.node)!;
  const text: string[] = [];
  if (node.kind === "recommendation") {
    text.push(node.text);
    context.lastAction = node.text;
    context.attempted = [...context.attempted, `${f.id}:${node.id}`].slice(-24);
    state.node = node.branches[0].next;
    node = f.nodes.find((n) => n.id === state.node)!;
  }
  text.push(node.text);
  if (!node.branches.length)
    state.outcome = node.kind === "completion" ? "resolved" : "escalated";
  return {
    text: text.join("\n\n"),
    context,
    followups: node.branches.map((b) => b.label),
    analysis: context.lastAction
      ? [
          "Recommendations are based on your reported symptoms; no system resource use was measured.",
        ]
      : undefined,
  };
}
export function advance(input: string, context: Context): Response | undefined {
  const state = context.diagnosis;
  if (!state || state.outcome) return;
  const f = workflow(state.id),
    node = f?.nodes.find((n) => n.id === state.node);
  if (!node) {
    context.diagnosis = undefined;
    return;
  }
  const match =
    node.branches.find(
      (b) => b.label.toLowerCase() === input.trim().toLowerCase(),
    ) ?? node.branches.find((b) => new RegExp(b.pattern, "i").test(input));
  if (!match) return;
  state.history = [
    ...state.history,
    { node: node.id, answer: input.slice(0, 200) },
  ].slice(-24);
  state.node = match.next;
  return present(context);
}
export function validateGraphs() {
  const errors: string[] = [];
  const graphIds = new Set<string>();
  for (const f of workflows) {
    if (graphIds.has(f.id)) errors.push(`${f.id}: duplicate workflow`);
    graphIds.add(f.id);
    const ids = new Set(f.nodes.map((n) => n.id));
    if (ids.size !== f.nodes.length || !ids.has(f.start))
      errors.push(`${f.id}: duplicate or missing node`);
    const reachable = new Set<string>();
    const visit = (id: string) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      f.nodes.find((n) => n.id === id)?.branches.forEach((b) => visit(b.next));
    };
    visit(f.start);
    if (f.nodes.some((n) => !reachable.has(n.id)))
      errors.push(`${f.id}: unreachable node`);
    for (const n of f.nodes)
      for (const b of n.branches) {
        if (!ids.has(b.next)) errors.push(`${f.id}: broken edge ${b.next}`);
        try {
          new RegExp(b.pattern);
        } catch {
          errors.push(`${f.id}: invalid pattern`);
        }
      }
  }
  return errors;
}
