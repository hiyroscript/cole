import { entities } from "./language";
import { normalize } from "../text";
import type { Fact } from "./case-state";
export type Understanding = {
  facts: Fact[];
  affectedBrowser?: string;
  workingBrowsers: string[];
  symptoms: string[];
  constraints: string[];
  hypothesis: string[];
  corrections: boolean;
  output: "table" | "checklist" | "steps" | "brief" | "standard";
  temporal: string[];
};
const symptoms: Record<string, string[]> = {
  freeze: ["freezes", "freezing", "frozen", "stuttering", "choppy", "stutters"],
  crash: ["crash", "crashes", "crashing"],
  video: ["video", "videos", "playback"],
  audio: ["audio", "sound", "microphone"],
  network: ["internet", "network", "wifi"],
  login: ["login", "signin", "sign-in", "password"],
  slow: ["slow", "sluggish", "lagging", "laggy"],
};
export function observe(input: string): Understanding {
  const result: Understanding = {
    facts: [],
    workingBrowsers: [],
    symptoms: [],
    constraints: [],
    hypothesis: [],
    corrections: /\bactually|correction|instead\b/i.test(input),
    output: "standard",
    temporal: [],
  };
  const clauses = input
    .split(/(?<!\d)[.!?;](?!\d)|,|\b(?:but|however|actually)\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
  let subject: string | undefined;
  for (const clause of clauses) {
    const n = normalize(clause),
      words = new Set(n.split(/\W+/));
    const entity = entities(clause);
    const browser = entity.filter((e) => e.kind === "browser").at(-1)?.value;
    if (browser) subject = browser;
    const negated = /\b(?:not|never|isnt|doesnt|wont)\b/.test(n);
    const working = /\b(?:works|working|fine|okay|ok)\b/.test(n) && !negated;
    const failures = Object.entries(symptoms)
      .filter(([, aliases]) => aliases.some((a) => words.has(a)))
      .map(([name]) => name);
    for (const symptom of failures) {
      if (negated && !/not responding|not working/.test(n))
        result.constraints.push(`not ${symptom}`);
      else if (!(working && symptom === "network"))
        result.symptoms.push(symptom);
    }
    if (
      subject &&
      (working ||
        failures.some((f) => f !== "network") ||
        /doesnt|fails|failed/.test(n))
    ) {
      const status = working ? "working" : "affected";
      result.facts.push({
        key: `browser:${subject}`,
        value: status,
        kind: "user",
        source: clause.slice(0, 500),
      });
      if (working) result.workingBrowsers.push(subject);
      else result.affectedBrowser = subject;
    }
    if (failures.includes("network") && working)
      result.facts.push({
        key: "network",
        value: "reported working",
        kind: "user",
        source: clause.slice(0, 500),
      });
    const platform = entity.filter((e) => e.kind === "platform").at(-1)?.value;
    if (platform && /\b(?:on|using|running|its|it is)\b/.test(n))
      result.facts.push({
        key: "platform",
        value: platform,
        kind: "user",
        source: clause.slice(0, 500),
      });
    if (/\b(?:could|might|possibly|maybe)\b/.test(n))
      for (const e of entity.filter((e) => e.kind === "api"))
        result.hypothesis.push(e.value);
    if (/\b(?:without|avoid|dont|do not|cannot|cant)\b/.test(n))
      result.constraints.push(clause.slice(0, 200));
  }
  result.symptoms = [...new Set(result.symptoms)];
  result.constraints = [...new Set(result.constraints)];
  const n = normalize(input);
  if (/\btable\b/.test(n)) result.output = "table";
  else if (/checklist/.test(n)) result.output = "checklist";
  else if (/steps|step by step/.test(n)) result.output = "steps";
  else if (/brief|short answer/.test(n)) result.output = "brief";
  result.temporal = [
    ...n.matchAll(
      /\b(?:today|yesterday|after updating|since the update|before|after|recently)\b/g,
    ),
  ].map((m) => m[0]);
  return result;
}
