import { knowledge } from "../data/knowledge";
import { normalize, rank } from "./matcher";
import {
  emptyContext,
  type Context,
  type Response,
  type Evidence,
  type Thinking,
} from "./types";
import { executeCommand, parseCommand } from "./commands";
import { flows, flowReply } from "./flows";
export type EngineOptions = {
  thinking: Thinking;
  facts: () => Promise<Evidence[]>;
  extension?: (name: string, arg: string) => Promise<string>;
  device?: string;
  stage?: (label: string) => void;
};
const get = (id: string) => knowledge.find((k) => k.id === id);
const browserNames = /\b(chrome|firefox|safari|edge|brave|opera)\b/i;
export function freshContext(previous: Context, now = Date.now()): Context {
  return now - previous.updated > 30 * 60_000 || previous.turns >= 24
    ? emptyContext()
    : { ...previous, attempted: [...previous.attempted] };
}
function compose(id: string, c: Context) {
  const k = get(id)!;
  const prefix =
    c.browser && ["slow", "secure", "privacy", "crash", "cache"].includes(id)
      ? `For ${c.browser} (your stated browser):\n\n`
      : "";
  if (c.depth === "brief")
    return (
      prefix +
      k.answer
        .split(/(?<=\.)\s/)
        .slice(0, 2)
        .join(" ")
    );
  if (c.depth === "steps" || c.depth === "detailed")
    return (
      prefix +
      k.answer +
      "\n\n" +
      k.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") +
      (c.depth === "detailed"
        ? `\n\nReference: [${k.category === "Product" ? "Varek documentation" : "Web platform documentation"}](${k.reference}).`
        : "")
    );
  return prefix + k.answer;
}
export async function respond(
  input: string,
  previous: Context,
  options: EngineOptions,
): Promise<Response> {
  const c = freshContext(previous);
  if (c.intent && !get(c.intent)) c.intent = undefined;
  if (c.flow && !flows.some((f) => f.id === c.flow?.id)) c.flow = undefined;
  if (c.pending) c.pending = c.pending.filter((id) => !!get(id));
  c.updated = Date.now();
  c.turns++;
  const n = normalize(input);
  const answer = (text: string, rest: Partial<Response> = {}): Response => ({
    text,
    context: c,
    ...rest,
  });
  options.stage?.("Matching the request");
  const cmd = parseCommand(input);
  if (cmd) {
    const needsFacts = [
      "browser",
      "device",
      "system",
      "screen",
      "language",
      "timezone",
      "permissions",
      "storage",
      "network",
      "performance",
    ].includes(cmd.name);
    if (needsFacts) options.stage?.("Checking available browser information");
    return executeCommand(
      cmd.name,
      cmd.arg,
      c,
      needsFacts ? await options.facts() : [],
      options.extension,
    );
  }
  if (/^\//.test(n))
    return answer(
      "Use /help for supported commands. Arbitrary scripts and shell commands cannot be executed.",
    );
  if (/^(hi|hello|hey|good morning|good evening)[!. ]*$/.test(n))
    return answer("Hello. What would you like to understand or troubleshoot?", {
      followups: ["What browser am I using?", "Why is my browser slow?"],
    });
  if (/^(thanks|thank you|thankyou|cheers)[!. ]*$/.test(n))
    return answer(
      "You’re welcome. You can continue with a follow-up whenever you need.",
    );
  if (/^(bye|goodbye|see you)[!. ]*$/.test(n))
    return answer(
      "Goodbye. Your saved conversations stay in this browser unless you delete them.",
    );
  if (
    /\b(actually|correction|im using|i use|i am using)\b/.test(n) &&
    browserNames.test(n)
  ) {
    c.browser = n.match(browserNames)![1];
    c.flow = undefined;
    return answer(
      `I’ll use ${c.browser} as your stated browser for this conversation. That is user-provided information, separate from automatic detection.`,
      {
        evidence: [
          {
            group: "Browser",
            label: "Stated browser",
            value: c.browser,
            kind: "User-provided",
          },
        ],
        followups: ["How can I improve my privacy?", "Why is my browser slow?"],
      },
    );
  }
  if (
    /^(yes|yeah|yep|no|nope|not yet|it worked|still broken|didnt help|done)[.! ]*$/.test(
      n,
    )
  ) {
    if (c.flow) {
      const flow = c.flow;
      const yes = /^(yes|yeah|yep|it worked|done)/.test(n);
      const reply = flowReply(flow.id, flow.step, yes);
      c.attempted.push(`${flow.id}:${flow.step}:${yes ? "yes" : "no"}`);
      c.flow = reply.done ? undefined : { id: flow.id, step: flow.step + 1 };
      return answer(reply.text, {
        followups: reply.done ? ["Start a new diagnosis"] : ["Yes", "No"],
      });
    }
    return answer(
      "Which check or question are you referring to? Tell me what you tried and what happened.",
    );
  }
  if (c.pending) {
    const selected = c.pending.find((id) => {
      const k = get(id)!;
      return normalize(k.title) === n || id === n;
    });
    if (selected) {
      c.pending = undefined;
      c.intent = selected;
      return answer(compose(selected, c), {
        followups: get(selected)!.followups,
      });
    }
    c.pending = undefined;
  }
  const depth = /shorter|brief|summarize that/.test(n)
    ? "brief"
    : /give me the steps|step by step|what should i try first/.test(n)
      ? "steps"
      : /more detail|explain that more|what does that mean/.test(n)
        ? "detailed"
        : undefined;
  if (depth) {
    c.depth = depth;
    if (c.intent && get(c.intent))
      return answer(compose(c.intent, c), {
        followups: get(c.intent)!.followups,
      });
    return answer(
      "What would you like me to explain? Name the browser feature or problem first.",
    );
  }
  if (/^(repeat|say that again|repeat that)$/.test(n) && c.intent)
    return answer(compose(c.intent, c));
  if (/quick check|check my (browser|device)|device information/.test(n)) {
    options.stage?.("Checking available browser information");
    return answer(
      "Here is what this browser exposes. These observations do not measure system-wide load.",
      {
        evidence: await options.facts(),
        followups: c.intent
          ? ["What should I try first?"]
          : ["Why is my browser slow?"],
      },
    );
  }
  if (/^(how about|what about) (firefox|chrome|safari|edge|brave)/.test(n)) {
    const id = n.match(browserNames)![1];
    return answer(get(id)!.answer, {
      followups: ["Compare Chrome and Firefox", "What about privacy?"],
    });
  }
  if (
    /\b(not slow|isnt slow|not crashing|isnt crashing)\b/.test(n) &&
    !/[;,]|\bbut\b/.test(n)
  )
    return answer(
      "Understood. What is happening instead? Describe the symptom you want to troubleshoot.",
    );
  const clean = input.replace(
    /\b(?:not slow|isnt slow|not crashing|isnt crashing)\b/gi,
    "",
  );
  const multi = clean.split(/\s+(?:and|also)\s+|;\s*/i).filter(Boolean);
  if (multi.length === 2) {
    const matches = multi.map((part) => rank(part)[0]);
    if (
      matches.every((m) => m && m.score >= 0.78) &&
      matches[0].record.id !== matches[1].record.id
    ) {
      c.intent = matches[1].record.id;
      return answer(
        matches
          .map((m) => `### ${m.record.title}\n${compose(m.record.id, c)}`)
          .join("\n\n"),
        {
          analysis:
            options.thinking !== "off"
              ? [
                  "Matched two independent knowledge topics.",
                  "No system-level measurements were taken.",
                ]
              : undefined,
        },
      );
    }
  }
  let candidates = rank(clean);
  if (
    /\bam i (?:on|using) (chrome|firefox|safari|edge|brave)\b/.test(n) ||
    /^(whats my browser|what browser do i have)$/.test(n)
  )
    candidates = [{ record: get("browser")!, score: 1 }];
  if (/^(is it secure|is that browser good)$/.test(n) && c.intent)
    candidates = [{ record: get("secure")!, score: 1 }];
  if (/^(how do i make it faster|make it faster)$/.test(n) && c.intent)
    candidates = [{ record: get("slow")!, score: 1 }];
  if (/start a new diagnosis/.test(n))
    return executeCommand("diagnose", "", c, []);
  if (!candidates.length || candidates[0].score < 0.63)
    return answer(
      "I don’t have a reliable answer to that yet. I can help with browser settings, device information, performance, privacy, and troubleshooting. Could you describe the specific feature or symptom?",
      { followups: ["What can you do?", "/help"] },
    );
  const top = candidates[0];
  if (
    candidates[1] &&
    top.score < 0.9 &&
    top.score - candidates[1].score < 0.055
  ) {
    c.pending = candidates.slice(0, 2).map((x) => x.record.id);
    return answer(
      `Do you mean ${candidates
        .slice(0, 2)
        .map((x) => x.record.title.toLowerCase())
        .join(" or ")}?`,
      { followups: candidates.slice(0, 2).map((x) => x.record.title) },
    );
  }
  c.intent = top.record.id;
  c.flow = undefined;
  const thorough =
    options.thinking === "on" ||
    (options.thinking === "auto" &&
      ([
        "Performance",
        "Troubleshooting",
        "Security",
        "Privacy",
        "Network",
      ].includes(top.record.category) ||
        flows.some((f) => f.id === top.record.id)));
  const analysis = thorough
    ? [
        `Matched “${top.record.title}” using the local knowledge index.`,
        `Reviewed ${top.record.steps.length} recommended checks; reversible checks come first.`,
        `No CPU load, temperature, running processes, or remote website availability was measured.`,
      ]
    : undefined;
  if (thorough) options.stage?.("Reviewing relevant checks");
  let text = compose(top.record.id, c);
  let evidence: Evidence[] | undefined;
  if (
    ["browser", "ram", "screen", "language", "timezone"].includes(top.record.id)
  ) {
    options.stage?.("Checking available browser information");
    const all = await options.facts();
    evidence = all.filter((f) =>
      top.record.id === "browser"
        ? f.group === "Browser"
        : top.record.id === "ram"
          ? f.group === "Device"
          : top.record.id === "screen"
            ? f.group === "Display"
            : top.record.id === "language"
              ? f.label.startsWith("Language")
              : f.label === "Time zone",
    );
    if (top.record.id === "browser") {
      const family =
        all.find((f) => f.label === "Browser family")?.value ?? "Unknown";
      const requested = n.match(browserNames)?.[1];
      text = requested
        ? `The browser identifies as ${family}. ${family.toLowerCase() === requested ? "That is consistent with " + requested + "." : "That does not confirm " + requested + "."} Browser identification can be reduced or spoofed.`
        : `This browser identifies as **${family}**. Identification is an estimate from browser-provided signals, not a verified installation inventory.`;
    }
  }
  const flow = thorough ? flows.find((f) => f.id === top.record.id) : undefined;
  if (flow) {
    c.flow = { id: flow.id, step: 0 };
    text += "\n\n" + flow.question;
    analysis?.push(
      "Selected a branching check; waiting for your observation before recommending the next step.",
    );
  }
  if (options.device && thorough) {
    analysis?.push(`Saved user-provided device note: ${options.device}`);
  }
  options.stage?.("Preparing the response");
  return answer(text, {
    evidence,
    analysis,
    followups: flow ? ["Yes", "No", "Quick check"] : top.record.followups,
  });
}
