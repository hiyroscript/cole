import { contextConversations } from "./gamma-context-conversations";
import { graphConversations } from "./gamma-graph-conversations";
import { extendedConversations } from "./gamma-conversations";
// Hand-authored development examples, mixing exact controls and independent paraphrases.
export const retrievalCases: {
  query: string;
  expected: string | null;
  kind: string;
}[] = [
  {
    query: "Could you detect my browsr please?",
    expected: "browser",
    kind: "typo",
  },
  { query: "My broswer is sluggish", expected: "slow", kind: "typo" },
  {
    query: "Every time I have a bunch of pages open everything becomes choppy",
    expected: "slow",
    kind: "paraphrase",
  },
  {
    query: "My browser isn’t slow, it just crashes",
    expected: "crash",
    kind: "negation",
  },
  {
    query: "My internet works but one website doesn’t",
    expected: "website",
    kind: "negation",
  },
  { query: "The issue isn’t with Wi-Fi", expected: null, kind: "negation" },
  { query: "Chrome works but Firefox doesn’t", expected: null, kind: "entity" },
  {
    query: "This browser closes itself unexpectedly",
    expected: "crash",
    kind: "paraphrase",
  },
  { query: "What is WebAssembly?", expected: "wasm", kind: "entity" },
  {
    query: "ERR_CERT_AUTHORITY_INVALID",
    expected: "certificate",
    kind: "entity",
  },
  { query: "DNS_PROBE_FINISHED_NXDOMAIN", expected: "dns", kind: "entity" },
  { query: "HTTP 403", expected: "403", kind: "entity" },
  {
    query: "How can I improve my privacy?",
    expected: "privacy",
    kind: "paraphrase",
  },
  {
    query: "I need to restore a closed tab",
    expected: "restore-tab",
    kind: "paraphrase",
  },
  { query: "How much RAM?", expected: "ram", kind: "entity" },
  { query: "Why is my laptop hot?", expected: "heat", kind: "paraphrase" },
  {
    query: "Can you inspect my other apps?",
    expected: "limits",
    kind: "boundary",
  },
  { query: "What is DNS?", expected: "dns", kind: "entity" },
  {
    query: "The site keeps logging me out",
    expected: "logout",
    kind: "paraphrase",
  },
  {
    query: "Windows memory pressure",
    expected: "win-memory",
    kind: "platform",
  },
  {
    query: "Activity Monitor memory pressure",
    expected: "mac-pressure",
    kind: "platform",
  },
  {
    query: "Wayland browser screen share fails",
    expected: "linux-wayland",
    kind: "platform",
  },
  {
    query: "Chrome Android extensions unavailable",
    expected: "android-extension",
    kind: "platform",
  },
  {
    query: "iPad identified as Mac",
    expected: "ipad-desktop",
    kind: "platform",
  },
  {
    query: "SharedArrayBuffer WASM threads",
    expected: "wasm-threads",
    kind: "entity",
  },
  {
    query: "the update is stuck waiting in another tab",
    expected: "sw-waiting",
    kind: "paraphrase",
  },
  {
    query: "A website asks me to run PowerShell to prove I am human",
    expected: "paste-command",
    kind: "security",
  },
  {
    query: "Can clearing cookies sign me out?",
    expected: "cookies",
    kind: "paraphrase",
  },
  { query: "I need browser assistance", expected: null, kind: "ambiguous" },
  { query: "Help with something broken", expected: null, kind: "ambiguous" },
  { query: "write me a love poem", expected: null, kind: "unsupported" },
  { query: "who won the football game", expected: null, kind: "unsupported" },
  {
    query: "tell me a joke about giraffes",
    expected: null,
    kind: "unsupported",
  },
  {
    query: "predict tomorrow’s stock prices",
    expected: null,
    kind: "unsupported",
  },
  {
    query: "translate my novel to French",
    expected: null,
    kind: "unsupported",
  },
  {
    query: "delete all my operating system files",
    expected: null,
    kind: "dangerous",
  },
  {
    query: "disable security and bypass certificate warnings",
    expected: null,
    kind: "dangerous",
  },
  {
    query: "what should I cook for dinner",
    expected: null,
    kind: "unsupported",
  },
];
export const conversations = [
  ...extendedConversations,
  ...contextConversations,
  ...graphConversations,
  {
    name: "browser privacy reference",
    turns: ["What browser am I using?", "Is it private?"],
    contains: "permissions",
  },
  {
    name: "browser comparison reference",
    turns: ["What browser am I using?", "Compare it with Firefox"],
    contains: "Firefox",
  },
  {
    name: "stated browser correction",
    turns: ["I am using Chrome", "Actually it is Brave", "What about privacy?"],
    contains: "brave",
  },
  {
    name: "video performance failed first check",
    turns: [
      "Why is my browser slow?",
      "Mostly YouTube",
      "Only when I watch videos",
      "That didn’t help",
    ],
    contains: "temporary profile",
  },
  {
    name: "tab workload success",
    turns: ["Why is my browser slow?", "Several tabs", "Yes"],
    contains: "helped",
  },
  {
    name: "unknown scope clarification",
    turns: ["Why is my browser slow?", "Not sure"],
    contains: "text page",
  },
  {
    name: "certificate escalation",
    turns: ["certificate warnings", "No", "No"],
    contains: "sensitive",
  },
  {
    name: "restart diagnosis",
    turns: ["Why is my browser slow?", "Video playback", "/diagnose restart"],
    contains: "Where",
  },
  {
    name: "stop diagnosis",
    turns: ["Why is my browser slow?", "/diagnose stop", "Yes"],
    contains: "Which check",
  },
  {
    name: "context reset loses reference",
    turns: ["What browser am I using?", "/context clear", "/context"],
    contains: "none",
  },
  {
    name: "source list before lookup",
    turns: ["What is DNS?", "/sources"],
    contains: "No public sources",
  },
  {
    name: "explain recommendation",
    turns: ["Why is my browser slow?", "Several tabs", "/explain"],
    contains: "task manager",
  },
  {
    name: "steps followup",
    turns: ["What is HTTPS?", "Give me the steps"],
    contains: "1.",
  },
  {
    name: "depth shortening",
    turns: ["What is DNS?", "More detail", "Make that shorter"],
    contains: "DNS",
  },
  {
    name: "diagnostic topic switch",
    turns: ["Why is my browser slow?", "What is DNS?"],
    contains: "DNS",
  },
  {
    name: "camera layers",
    turns: ["mac browser camera denied", "Every browser site", "No"],
    contains: "local application",
  },
  {
    name: "indexeddb other window",
    turns: ["indexeddb blocked upgrade", "An installed app window", "No"],
    contains: "versionchange",
  },
  {
    name: "notification source",
    turns: ["desktop notification virus fake", "A site notification", "No"],
    contains: "OS security",
  },
  {
    name: "scope when permissions denied",
    turns: ["android site camera blocked", "Permission denied", "Yes"],
    contains: "helped",
  },
  {
    name: "privacy is not malware diagnosis",
    turns: [
      "What browser am I using?",
      "Why is my browser definitely infected?",
    ],
    contains: "cannot confirm",
  },
] as const;
