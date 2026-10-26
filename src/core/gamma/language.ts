import { normalize } from "../text";
export type Entity = {
  kind: "browser" | "platform" | "api" | "error" | "version" | "display";
  value: string;
};
const groups: [Entity["kind"], RegExp][] = [
  [
    "browser",
    /\b(chromium|chrome|firefox|safari|edge|brave|opera|webkit|gecko|blink)\b/gi,
  ],
  [
    "platform",
    /\b(windows(?:\s+\d+)?|macos|linux|ubuntu|android|ios|ipados)\b/gi,
  ],
  [
    "api",
    /\b(webgpu|webgl|webassembly|indexeddb|service worker|cache storage|dns|dhcp|https?|cors|csp|vpn|proxy|cookies|passkeys|webrtc|avif|webp|vram|ram|cpu|gpu)\b/gi,
  ],
  ["error", /\b(?:ERR_[A-Z_]+|DNS_PROBE_[A-Z_]+|HTTP\s+[45]\d\d)\b/gi],
  ["version", /\b\d+\.\d+(?:\.\d+)*\b/g],
  ["display", /\b\d{3,5}\s*[x×]\s*\d{3,5}\b/gi],
];
export function entities(input: string): Entity[] {
  return groups.flatMap(([kind, re]) =>
    [...input.matchAll(re)].map((m) => ({ kind, value: m[0].toLowerCase() })),
  );
}
export function understand(input: string) {
  const normalized = normalize(input);
  const excluded: string[] = [];
  // Remove request framing, never technical identifiers or symptom qualifiers.
  // This grammar is shared across topics rather than adding topic aliases.
  const semanticInput = normalized
    .replace(
      /^(?:please\s+)?(?:(?:can|could|would) you\s+)?(?:briefly\s+)?(?:explain|describe|tell me about|define)\s+(?:what\s+)?/i,
      "",
    )
    .replace(
      /\s+(?:in simple terms|for a beginner|without jargon|for me)[?.!]*$/i,
      "",
    );
  let positive = semanticInput.replace(
    /\b(?:isnt|arent|not|is not|isnt with|not with)\s+(?:(?:really|a|the)\s+)?(slow|sluggish|crashing|crash|wifi|wi-fi|network|internet)\b/g,
    (_, symptom: string) => {
      excluded.push(symptom);
      return " ";
    },
  );
  // A working connection is a constraint, not an offline symptom.
  positive = positive.replace(
    /\b(internet|network|wifi) (?:works|is working|is fine)\b/g,
    (_, value: string) => {
      excluded.push(value);
      return " ";
    },
  );
  // Contrast is evidence. Never discard the affected subject before “but”.
  positive = positive.replace(/\b(?:but|however)\b/g, " ");
  const substitutions: [RegExp, string][] = [
    [/\b(crashes|crashing|quits unexpectedly|closes itself)\b/g, "crash"],
    [/\b(choppy|sluggish|laggy|lagging|unresponsive)\b/g, "slow"],
    [
      /\b(bunch of pages|lots of tabs|many pages|several tabs)\b/g,
      "many browser tabs",
    ],
    [/\b(pages open|pages at once)\b/g, "browser tabs"],
    [/\b(wont|doesnt|cant)\b/g, "not"],
    [
      /\b(err_cert_authority_invalid|err_cert_date_invalid)\b/g,
      "certificate error",
    ],
    [/\bdns_probe_finished_nxdomain\b/g, "dns domain error"],
  ];
  // normalize() preserves neither underscores nor apostrophes.
  positive = positive
    .replace(
      /err cert (?:authority invalid|date invalid)/g,
      "certificate error",
    )
    .replace(/dns probe finished nxdomain/g, "dns domain error");
  for (const [pattern, replacement] of substitutions)
    positive = positive.replace(pattern, replacement);
  positive = positive.replace(
    /\b(?:every time|lately|just|really|everything|becomes|keeps|the issue|issue)\b/g,
    " ",
  );
  positive = positive.replace(
    /\b(?:website|site) not\b/g,
    "website will not open",
  );
  // Retain the subject when a contrast clause supplies only the replacement symptom.
  if (
    /\bbrowser\b/.test(normalized) &&
    /\bcrash\b/.test(positive) &&
    !/\bbrowser\b/.test(positive)
  )
    positive += " browser";
  if (/slow/.test(positive) && /browser|tabs/.test(positive))
    positive += " browser slow";
  if (
    /\b(run|paste)\b/.test(positive) &&
    /powershell|terminal/.test(positive) &&
    /human|verify|captcha|prove/.test(positive)
  )
    positive += " verification paste commands";
  return {
    raw: input,
    normalized,
    positive: positive.trim(),
    excluded,
    entities: entities(input),
    dangerous:
      /\b(delete|erase|wipe|disable security|bypass certificate|reset browser)\b/.test(
        normalized,
      ),
  };
}
