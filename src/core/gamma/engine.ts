import { frenchAnswer } from "./french";
import { comparisonAspect, comparisonFollowup } from "./comparison";
import { executionRequirement, unmetRequirement } from "./requirements";
import { naturalTool } from "./natural-tools";
import { assessAnswerability } from "./answerability";
import { questionFrame } from "./question";
import { executeTrustedTool } from "./trusted-tools";
import { probe } from "./probe";
import { clearPublicCache } from "./public-sources";
import {
  documentAnswer,
  documentOperation,
  documentRequest,
  type LocalDocument,
} from "./documents";
import { applyMemory } from "./memory";
import { plan, continuePlan, evidenceAnswer } from "./reasoning";
import { observe } from "./observations";
import { mergeFacts } from "./case-state";
import { restorePacks } from "./packs";
import { compareKnowledge, comparisonInput, comparisonPair } from "./compare";
import { taskReference } from "./task-reference";
import { analyzeRequest } from "./request";
import { resolveTaskInput } from "./task-input";
import type { NumericValue } from "./calculator";
import { followupFrame } from "./followup";
import { runCapability } from "./capabilities";
import { retrieveCandidates } from "./hybrid";
import { clarificationChoice, freshContext, resolveReference } from "./context";
export { freshContext } from "./context";
import { begin, advance, workflow } from "./workflows";
import { health } from "./diagnostics";
import { diagnosticGroups } from "./diagnostics";
import { webResponse } from "./web";
import { understand } from "./language";
import { features } from "../../lib/diagnostics";
import { knowledge } from "../../data/knowledge";
import { normalize, rank } from "./retrieval";
import {
  type Context,
  type Response,
  type Evidence,
  type Thinking,
} from "../types";
import { executeCommand, parseCommand } from "../commands";
import { flows, flowReply } from "../flows";
export type EngineOptions = {
  document?: LocalDocument;
  documents?: LocalDocument[];
  thinking: Thinking;
  webSources?: boolean;
  enhanced?: boolean;
  signal?: AbortSignal;
  facts: () => Promise<Evidence[]>;
  extension?: (name: string, arg: string) => Promise<string>;
  device?: string;
  stage?: (label: string) => void;
};
const get = (id: string) => knowledge.find((k) => k.id === id);
const browserNames = /\b(chrome|firefox|safari|edge|brave|opera)\b/i;
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
  if (
    c.depth === "steps" ||
    c.depth === "detailed" ||
    c.familiarity === "beginner"
  )
    return (
      prefix +
      k.answer +
      "\n\n" +
      k.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") +
      (c.depth === "detailed"
        ? `\n\nReference: [${k.category === "Product" ? "Cole documentation" : "Web platform documentation"}](${k.reference}).`
        : "")
    );
  return prefix + k.answer;
}
async function respondSingle(
  input: string,
  previous: Context,
  options: EngineOptions,
  calculationInput?: NumericValue,
): Promise<Response> {
  options.signal?.throwIfAborted();
  const c = freshContext(previous);
  input = resolveReference(input, c);
  if (c.intent && !get(c.intent)) c.intent = undefined;
  if (c.flow && !flows.some((f) => f.id === c.flow?.id)) c.flow = undefined;
  if (c.pending) c.pending = c.pending.filter((id) => !!get(id));
  c.updated = Date.now();
  c.turns++;
  let n = normalize(input)
    .replace(/[.?!]+$/, "")
    .trim();
  const answer = (text: string, rest: Partial<Response> = {}): Response => ({
    text,
    context: c,
    ...rest,
  });
  options.stage?.("Matching the request");
  const cmd = parseCommand(input);
  if (cmd) {
    const trusted = await executeTrustedTool(cmd.name, cmd.arg, c, options);
    if (trusted) return trusted;
  }
  if (cmd) {
    const needsFacts = [
      "health",
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
      { webSources: options.webSources, enhanced: options.enhanced },
    );
  }
  if (/^\//.test(input.trim()))
    return answer(
      "Use /help for supported commands. Arbitrary scripts and shell commands cannot be executed.",
    );
  const natural = naturalTool(input);
  if (natural) {
    options.stage?.(`Running local ${natural.name}`);
    return (await executeTrustedTool(natural.name, natural.input, c, {
      ...options,
      calculationInput,
    }))!;
  }
  const documentQuery = documentRequest(input);
  if (documentQuery !== undefined) {
    const result = documentOperation(
      options.documents ?? (options.document ? [options.document] : []),
      documentQuery,
    );
    return answer(result.text, { operation: result });
  }
  const french = frenchAnswer(input, c, options.signal);
  if (french) return french;
  const statedPlatform = understand(input)
    .entities.filter((e) => e.kind === "platform")
    .at(-1);
  if (statedPlatform && /\b(using|on|running|actually)\b/.test(n))
    c.platform = statedPlatform.value;
  if (
    /^(?:please\s+)?(?:write|compose|invent|generate|draw|design)\b/i.test(
      input,
    ) &&
    !/troubleshooting|checklist|report|plan/.test(n)
  )
    return answer(
      "I don’t have a reliable answer for open-ended writing, image generation or arbitrary program creation. Gamma can retrieve authored explanations, compare supported subjects, calculate, analyze supplied text and plan bounded checks. Madon is a separately selected generative model.",
    );
  if (c.case?.pending && /^(?:i tried that|tried it)[.!?]*$/i.test(input))
    return answer(
      "Did the suggested check help, fail, or remain inconclusive? I will keep its result separate from a confirmed diagnosis.",
      { followups: ["That helped", "That didn’t help", "Skip that check"] },
    );
  if (
    c.case &&
    /^(?:why|explain the evidence|what do we know)[?!]*$/i.test(input)
  )
    return evidenceAnswer("", c);
  const continuation = continuePlan(input, c);
  if (continuation) return continuation;
  const followupComparison =
    comparisonAspect(input, c) ?? comparisonFollowup(input, c);
  if (followupComparison) return answer(followupComparison);
  const observed = observe(input);
  if (
    /^i prefer (?:short|brief|detailed|step by step) answers[.!]*$/i.test(input)
  ) {
    c.depth = /short|brief/i.test(input)
      ? "brief"
      : /detailed/i.test(input)
        ? "detailed"
        : "steps";
    return answer(
      `I’ll use ${c.depth} answers in this conversation. This is temporary context; cross-conversation preferences require /memory on and an explicit /memory save command.`,
    );
  }
  if (observed.output === "brief" || observed.output === "steps")
    c.depth = observed.output;

  if (observed.statedBrowser) c.browser = observed.statedBrowser;
  if (c.case && observed.facts.length) mergeFacts(c.case, observed.facts);
  if (c.case && observed.corrections) {
    if (observed.statedBrowser || observed.affectedBrowser) {
      c.browser = observed.statedBrowser ?? observed.affectedBrowser;
      for (const fact of c.case.facts)
        if (
          fact.key.startsWith("browser:") &&
          fact.value === "affected" &&
          fact.key !== `browser:${c.browser}`
        )
          fact.contradicted = true;
      mergeFacts(c.case, [
        {
          key: `browser:${c.browser}`,
          value: "affected",
          kind: "user",
          source: input.slice(0, 500),
        },
      ]);
      c.case.corrections.push(`Stated browser corrected to ${c.browser}`);
      // Do not replay the obsolete user statement and undo the correction.
      c.case.goal = c.case.goal.replace(
        /\b(?:chrome|firefox|safari|edge|brave|opera)\b/i,
        c.browser!,
      );
    }
    const platform = observed.facts.findLast((f) => f.key === "platform");
    if (platform) c.platform = platform.value;
    c.case.pending = undefined;
    return plan(c.case.goal, c);
  }
  if (
    /^(?:create|make|give me) (?:a )?(?:troubleshooting )?plan\b/i.test(input)
  )
    return plan(input, c);
  if (
    (observed.statedBrowser &&
      observed.symptoms.some((s) =>
        ["slow", "freeze", "crash", "video"].includes(s),
      )) ||
    /\b(?:diagnose|troubleshoot)\b/i.test(input)
  )
    return plan(input, c);
  if (c.case && /\b(?:back to|resume|continue fixing)\b/i.test(input)) {
    const check = c.case.checks.find((k) => k.id === c.case?.pending);
    return check
      ? answer(
          `Resumed: ${c.case.goal}\n\nPending check: ${check.text}\n\nReport whether it helped, failed, or should be skipped.`,
        )
      : plan(c.case.goal, c);
  }
  if (c.case?.pending && /^why.*(?:check|test|matter)/i.test(input)) {
    const check = c.case.checks.find((k) => k.id === c.case?.pending);
    return answer(
      `The pending check is: ${check?.text}\n\nIt tests whether the symptom changes under a controlled condition. A change narrows the hypotheses; it does not prove the cause. No check has been executed by Cole.`,
    );
  }
  if (
    observed.affectedBrowser &&
    observed.workingBrowsers.length &&
    observed.symptoms.some((s) =>
      ["freeze", "video", "crash", "slow"].includes(s),
    )
  )
    return plan(input, c);
  if (/^why.*(?:hardware|gpu) acceleration/i.test(input))
    return evidenceAnswer("hardware acceleration", c);
  if (
    /^(?:summarize|search|find in|ask about) (?:the |this |my )?(?:document|file)\b/i.test(
      input,
    )
  )
    return answer(
      documentAnswer(
        options.document,
        input.replace(
          /^(?:summarize|search|find in|ask about) (?:the |this |my )?(?:document|file)\s*/i,
          "",
        ),
      ),
    );
  const web = await webResponse(
    input,
    c,
    options.webSources === true,
    options.signal ?? new AbortController().signal,
  );
  if (web) return web;
  if (/\b(chrome|firefox|safari|edge|brave) works but/.test(n)) {
    c.browser = n.match(/but (chrome|firefox|safari|edge|brave)/)?.[1];
    c.diagnosis = undefined;
    c.lastAction = undefined;
    if (/chrome/.test(n) && /firefox/.test(n))
      c.topic = "compare chrome firefox";
    return answer(
      `For ${c.browser ?? "the affected browser"}, does it fail to launch, crash, or fail to load one website? The working browser is a useful comparison.`,
    );
  }
  if (/definitely infected|certainly infected/.test(n))
    return answer(
      "I cannot confirm an infection from that statement. What have you observed: unexpected redirects, permission prompts, downloads, or a security warning? Do not install software advertised by a warning page.",
    );
  if (
    /\b(ram|memory)\b/.test(n) &&
    /using right now|current usage|being used|utilization/.test(n)
  )
    return answer(
      "A website cannot read system-wide RAM usage. On Windows use Task Manager → Performance → Memory; on macOS use Activity Monitor → Memory; on Linux use your system monitor. Browser memory estimates are not current usage.",
    );
  if (
    /\b(actually|correction|im using|i use|i am using)\b/.test(n) &&
    browserNames.test(n) &&
    (observed.corrections || !observed.symptoms.length)
  ) {
    c.browser = observed.statedBrowser ?? observed.affectedBrowser ?? c.browser;
    c.flow = undefined;
    c.diagnosis = undefined;
    c.lastAction = undefined;
    return answer(
      `I’ll use ${c.browser} as your stated browser for this conversation. That is user-provided information, separate from automatic detection.`,
      {
        evidence: [
          {
            group: "Browser",
            label: "Stated browser",
            value: c.browser ?? "unknown",
            kind: "User-provided",
          },
        ],
        followups: ["How can I improve my privacy?", "Why is my browser slow?"],
      },
    );
  }
  if (/^(?:can you )?explain (?:the )?(first|second|third) option/.test(n)) {
    const ordinal = /first/.test(n) ? 0 : /second/.test(n) ? 1 : 2;
    const graph = c.diagnosis && workflow(c.diagnosis.id);
    const node =
      graph && graph.nodes.find((node) => node.id === c.diagnosis?.node);
    const branch =
      node?.kind === "question" ? node.branches[ordinal] : undefined;
    const target =
      branch && graph?.nodes.find((node) => node.id === branch.next);
    return answer(
      target && branch
        ? `“${branch.label}” would lead to this check: ${target.text}\n\nNo option has been selected yet.`
        : "Which options do you mean? Name the option or start a diagnostic question so I can explain the relevant check.",
    );
  }
  if (/^(can you )?compare them$/.test(n)) {
    if (
      c.topic === "compare chrome firefox" ||
      c.topic === "compare cache cookies"
    )
      n = c.topic;
    else
      return answer(
        "Which two browsers or features would you like to compare?",
      );
  }
  if (
    !understand(input).excluded.length &&
    !/^(what|why|how|explain|compare|check|quick|tell|can you|give me)/.test(n)
  ) {
    const continuation = advance(n, c);
    if (continuation)
      return {
        ...continuation,
        analysis:
          options.thinking === "off" ? undefined : continuation.analysis,
      };
  }
  if (
    /^(explain|why).*(second|last|recommend|option|check)/.test(n) &&
    c.lastAction
  )
    return answer(
      `The most recent recommendation was: ${c.lastAction}\n\nIt is a reversible comparison intended to narrow possible causes, not proof of a diagnosis.`,
    );
  const compared =
    n === "compare cache cookies"
      ? "cache and cookies"
      : n === "compare chrome firefox"
        ? "chrome and firefox"
        : comparisonInput(input);
  if (compared) {
    if (comparisonPair(compared, "cache", "cookies")) {
      c.topic = "compare cache cookies";
      c.comparison = ["cache", "cookies"];
      c.authoredSources = ["cache", "cookies"];
      return answer(
        "Cache stores reusable resources such as images and scripts. Cookies store small values sent with matching requests, often for sign-in or preferences. Clearing cache can force downloads; clearing cookies can sign you out. Neither action should be used as a universal fix.",
      );
    }
    if (comparisonPair(compared, "chrome", "firefox")) {
      c.intent = "compare";
      c.topic = "compare chrome firefox";
      c.comparison = ["chrome", "firefox"];
      c.authoredSources = ["compare"];
      return answer(compose("compare", c));
    }
  }
  if (
    /^(?:check|inspect|show)(?: me)? (?:my |this )?browser capabilities[?.!]*$/.test(
      n,
    )
  ) {
    const evidence = await options.facts();
    options.signal?.throwIfAborted();
    return answer(health(evidence), { evidence });
  }
  if (compared) return answer(compareKnowledge(compared, c));
  if (taskReference(input)?.kind === "group" && c.comparison?.length)
    return answer(
      "I don’t have a supported answer for that comparison detail. Name the subjects and the specific property you want to compare; the existing evidence does not establish every requested detail.",
    );
  const groups = diagnosticGroups(n);
  const featureRequest =
    /support|available|can.*(?:install|query|use)|check/.test(n) &&
    /webgpu|indexeddb|pwa|storage.*usage/.test(n);
  if (featureRequest || (groups.length > 1 && /and|also/.test(n))) {
    options.stage?.("Checking browser capabilities");
    const facts = await options.facts();
    const evidence = facts.filter((f) => groups.includes(f.group));
    const support = features();
    const selected = Object.entries(support).filter(
      ([key]) =>
        n.includes(key.toLowerCase()) ||
        (/pwa/.test(n) && key === "Service worker") ||
        (/storage/.test(n) && key === "Storage estimate"),
    );
    return answer(
      (groups.length
        ? "Available browser observations are attached.\n\n"
        : "") +
        selected
          .map(
            ([key, value]) =>
              `${key}: ${value ? "API exposed" : "unavailable"}.`,
          )
          .join("\n") +
        "\n\nAPI presence is not a successful operation or an installation guarantee.",
      { evidence },
    );
  }
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
  const ordinal = clarificationChoice(input, c.pending ?? []);
  if (ordinal === null)
    return answer(
      "I don’t have that clarification option. Please name the topic you mean.",
      {
        followups: c.pending?.map((id) => get(id)!.title),
      },
    );
  if (c.pending) {
    const selected =
      ordinal ??
      c.pending.find((id) => {
        const k = get(id)!;
        return normalize(k.title) === n || id === n;
      });
    if (selected) {
      const platform = c.platform
        ?.toLowerCase()
        .replace(/windows.*/, "windows")
        .replace("ubuntu", "linux");
      const record = get(selected)!;
      if (
        platform &&
        record.platforms?.length &&
        !record.platforms.some((p) => p.toLowerCase() === platform)
      )
        return answer(
          `These instructions apply to ${record.platforms.join(" or ")}. You stated ${platform}. Are you asking about a different device?`,
        );
      c.pending = undefined;
      c.intent = selected;
      c.authoredSources = [selected];
      c.sources = undefined;
      return answer(compose(selected, c), {
        followups: get(selected)!.followups,
      });
    }
    c.pending = undefined;
  }
  const frame = questionFrame(input);
  if (frame?.style === "brief") c.depth = "brief";
  const followup = followupFrame(input);
  const depth = followup?.kind === "depth" ? followup.depth : undefined;
  if (depth) {
    c.depth = depth;
    if (c.intent && get(c.intent)) {
      c.authoredSources = [c.intent];
      return answer(compose(c.intent, c), {
        followups: get(c.intent)!.followups,
      });
    }
    return answer(
      "What would you like me to explain? Name the browser feature or problem first.",
    );
  }
  if (followup?.kind === "repeat" && c.intent) {
    c.authoredSources = [c.intent];
    return answer(compose(c.intent, c));
  }
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
    !/[;,]|\bbut\b/.test(input)
  )
    return answer(
      "Understood. What is happening instead? Describe the symptom you want to troubleshoot.",
    );
  const requirement = executionRequirement(input);
  if (requirement) return answer(unmetRequirement(requirement));
  let candidates = await retrieveCandidates(
    input,
    options.enhanced === true,
    options.signal,
  );
  if (
    /\bam i (?:on|using) (chrome|firefox|safari|edge|brave)\b/.test(n) ||
    /^(whats my browser|what browser do i have)$/.test(n)
  )
    candidates = [
      { record: get("browser")!, score: 1, lexical: 1, coverage: 1 },
    ];
  if (
    /^is it safe$/.test(n) &&
    c.intent &&
    ![
      "browser",
      "chrome",
      "firefox",
      "safari",
      "edge",
      "brave",
      "secure",
    ].includes(c.intent)
  )
    return answer(
      "Which action or feature do you mean? Safety depends on the specific action and what data it changes; I cannot certify it from an ambiguous reference.",
    );
  if (
    /^(is it safe|is it secure|is that browser good)$/.test(n) &&
    (c.intent || c.browser)
  )
    candidates = [
      { record: get("secure")!, score: 1, lexical: 1, coverage: 1 },
    ];
  if (/^(how do i make it faster|make it faster)$/.test(n) && c.intent)
    candidates = [{ record: get("slow")!, score: 1, lexical: 1, coverage: 1 }];
  if (/^inspect\b/.test(n))
    return answer(
      "I cannot execute that inspection. Use /help to see the supported browser observations and permission-gated page tools; no tab or file content was read.",
    );
  if (/start a new diagnosis/.test(n))
    return executeCommand("diagnose", "", c, []);
  if (candidates[0]?.discovery) {
    c.pending = candidates
      .filter((candidate) => candidate.discovery)
      .slice(0, 3)
      .map((candidate) => candidate.record.id);
    return answer(
      `I found potentially related local guidance. Are you asking about ${candidates
        .filter((candidate) => candidate.discovery)
        .slice(0, 3)
        .map((candidate) => candidate.record.title.toLowerCase())
        .join(
          " or ",
        )}? Semantic similarity alone does not establish the answer.`,
      { followups: c.pending.map((id) => get(id)!.title) },
    );
  }
  if (
    !candidates.length ||
    (!candidates[0].semanticAccepted &&
      !candidates[0].evidenceAccepted &&
      candidates[0].score < 0.63)
  )
    return answer(
      "I don’t have a reliable answer to that yet. I can help with browser settings, device information, performance, privacy, and troubleshooting. Could you describe the specific feature or symptom?",
      { followups: ["What can you do?", "/help"] },
    );
  const top = candidates[0];
  const support = assessAnswerability(input, top.record);
  if (support.blocking)
    return answer(
      `I don’t have a reliable answer for every requested detail. ${support.reasons.join(" ")} Related guidance is not evidence of the missing detail.`,
    );

  if (
    !top.semanticAccepted &&
    !top.evidenceAccepted &&
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
  const platform = c.platform
    ?.replace(/windows.*/, "Windows")
    .replace(/macos/, "macOS")
    .replace(/ubuntu|linux/, "Linux")
    .replace(/android/, "Android")
    .replace(/ipados|ios/, "iOS");
  if (
    platform &&
    top.record.platforms?.length &&
    !top.record.platforms.includes(platform)
  )
    return answer(
      `These instructions apply to ${top.record.platforms.join(" or ")}. You stated ${platform}. Are you asking about a different device?`,
      { followups: ["/context clear"] },
    );
  c.topic = top.record.title;
  c.goal = input.slice(0, 200);
  c.intent = top.record.id;
  c.authoredSources = [top.record.id];
  c.sources = undefined;
  c.flow = undefined;
  c.diagnosis = undefined;
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
        !!workflow(top.record.id)));
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
      c.detectedBrowser = family;
      const requested = n.match(browserNames)?.[1];
      text = requested
        ? `The browser identifies as ${family}. ${family.toLowerCase() === requested ? "That is consistent with " + requested + "." : "That does not confirm " + requested + "."} Browser identification can be reduced or spoofed.`
        : `This browser identifies as **${family}**. Identification is an estimate from browser-provided signals, not a verified installation inventory.`;
    }
  }
  const flow = thorough ? workflow(top.record.id) : undefined;
  const guided = flow ? begin(flow.id, c) : undefined;
  if (guided) {
    text += "\n\n" + guided.text;
    analysis?.push(
      "Selected a diagnostic graph; waiting for your observation.",
    );
  }
  if (options.device && thorough) {
    analysis?.push(`Saved user-provided device note: ${options.device}`);
  }
  options.stage?.("Preparing the response");
  return answer(text, {
    evidence,
    analysis,
    followups: guided ? guided.followups : top.record.followups,
  });
}

// Bounded composition executes only user-authored tasks. Supplied documents,
// commands and source text never re-enter this dispatcher.
export async function respond(
  input: string,
  previous: Context,
  options: EngineOptions,
): Promise<Response> {
  options.signal?.throwIfAborted();
  if (input.length > 20000)
    return {
      text: "Please keep a message within 20,000 characters or import a bounded local document.",
      context: previous,
    };
  previous = applyMemory(previous);
  await restorePacks(options.signal);
  const request = analyzeRequest(input);
  if (request.tasks.length < 2 || documentRequest(input) !== undefined)
    return respondSingle(input, previous, options);
  let context = freshContext(previous);
  const authoredSources = new Set<string>();
  const results: NonNullable<Response["tasks"]> = [];
  const parts: string[] = [],
    evidence: Evidence[] = [];
  for (const task of request.tasks) {
    options.signal?.throwIfAborted();
    const resolved = resolveTaskInput(task, results);
    if (!resolved.ready) {
      results.push({
        id: task.id,
        intent: task.intent,
        status: "needs-information",
        sources: [],
        dependsOn: task.dependsOn,
      });
      parts.push(
        `### ${task.id + 1}. Clarification needed\n${resolved.detail}`,
      );
      continue;
    }
    const text = resolved.text;
    if (resolved.comparison) context.comparison = resolved.comparison;
    if (resolved.subject) context.intent = resolved.subject;
    // A compound request cannot grant permissions, issue commands, or send
    // a fragment of private material to a provider. Ask for a separate action.
    if (/^(?:run\s+)?\/|^(?:search|look up|lookup)\b/i.test(text.trim())) {
      results.push({
        id: task.id,
        intent: task.intent,
        status: "blocked",
        sources: [],
      });
      parts.push(
        `### ${task.id + 1}. Separate action required\nSend this command or public lookup as a separate explicit request.`,
      );
      continue;
    }
    options.stage?.(
      `Part ${task.id + 1} of ${request.tasks.length}: ${task.intent}`,
    );
    // Never retain another task's source IDs as evidence for this task.
    const response = await respondSingle(
      text,
      { ...context, authoredSources: undefined },
      { ...options, webSources: false },
      resolved.calculationInput,
    );
    if (response.effect) {
      results.push({
        id: task.id,
        intent: task.intent,
        status: "blocked",
        sources: [],
      });
      parts.push(
        `### ${task.id + 1}. Separate action required\nSend this action separately.`,
      );
      continue;
    }
    context = response.context;
    const sources = context.authoredSources ?? [];
    const verifiedTool = response.operation?.status === "completed";
    // Evidence and referents are different: the authored Chrome/Firefox
    // comparison is one source but discusses two independently named subjects.
    const subjects =
      sources.length &&
      (comparisonInput(text) || task.reference?.kind === "group") &&
      context.comparison?.length
        ? context.comparison
        : sources;
    results.push({
      id: task.id,
      intent: task.intent,
      status: sources.length || verifiedTool ? "answered" : "needs-information",
      sources,
      subjects: [...subjects],
      dependsOn: task.dependsOn,
      value: verifiedTool ? response.operation?.value : undefined,
    });
    for (const id of context.authoredSources ?? []) authoredSources.add(id);
    parts.push(
      `### ${response.context.goal === text && response.context.intent ? (get(response.context.intent)?.title ?? task.intent) : task.intent === "unknown" ? "Request" : task.intent}\nPart ${task.id + 1} of ${request.tasks.length}\n\n${response.text}`,
    );
    for (const item of response.evidence ?? [])
      if (
        !evidence.some((e) => e.label === item.label && e.value === item.value)
      )
        evidence.push(item);
  }
  if (request.omitted)
    parts.push(
      `There are ${request.omitted} additional parts. Please send them in a separate message; I handle at most six parts per request.`,
    );
  context.turns = previous.turns + 1;
  context.authoredSources = [...authoredSources].slice(-12);
  return {
    text: parts.join("\n\n"),
    context,
    evidence: evidence.length ? evidence : undefined,
    tasks: results,
    analysis:
      options.thinking === "off"
        ? undefined
        : results.map(
            (r) =>
              `Part ${r.id + 1}: ${r.status}${r.sources.length ? `; authored sources: ${r.sources.join(", ")}` : ""}.`,
          ),
  };
}
