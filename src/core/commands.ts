import { emptyContext } from "./types";
import { health } from "./gamma/diagnostics";
import { begin } from "./gamma/workflows";
import { semantic } from "./gamma/semantic";
import { normalizeModel } from "../lib/legacy";
import type { Response, Context, Thinking, Evidence } from "./types";
import { knowledge } from "../data/knowledge";
import { features } from "../lib/diagnostics";
export const commands = [
  ["gamma", "Gamma engine and privacy information"],
  ["health", "Evidence-aware browser capability report"],
  ["context", "Temporary context: show or clear"],
  ["explain", "Explain the last recommended check"],
  ["sources", "Actual sources in the last web response"],
  ["enhance", "Optional local understanding: status, on, off"],
  ["web", "Public Wikimedia lookup: status, on, off"],
  ["compare", "Compare Chrome and Firefox, or cache and cookies"],
  ["help", "Show available commands"],
  ["about", "About Varek and Gamma"],
  ["model", "Available models"],
  ["think", "Analysis preference: auto, on, off"],
  ["theme", "Appearance: light, dark, system"],
  ["clear", "Clear this chat after confirmation"],
  ["new", "Start a new conversation"],
  ["export", "Download this conversation"],
  ["shortcuts", "Keyboard shortcuts"],
  ["browser", "Reported browser information"],
  ["device", "Available device information"],
  ["system", "Platform hints and access limits"],
  ["screen", "Display and viewport"],
  ["language", "Browser language preferences"],
  ["timezone", "Reported time zone"],
  ["permissions", "Query selected permission states"],
  ["features", "Supported browser APIs"],
  ["storage", "Origin usage and quota estimates"],
  ["privacy", "Privacy recommendations"],
  ["network", "Connection hints, not a speed test"],
  ["diagnose", "Start guided troubleshooting"],
  ["performance", "Performance observations and advice"],
  ["compatibility", "Feature support in this browser"],
  ["security", "Safer browsing practices"],
  ["cache", "Safe cache troubleshooting"],
  ["cookies", "Cookie behavior and settings"],
  ["tab", "Current tab · extension only"],
  ["tabs", "Pin the current tab · extension only"],
  ["page", "Inspect page metadata · extension only"],
  ["reader", "Extract page text · extension only"],
  ["extensions", "Explain extension permissions"],
].map(([name, description]) => ({
  name,
  description,
  extension: ["tab", "tabs", "page", "reader"].includes(name),
  args:
    name === "diagnose"
      ? ["status", "restart", "stop"]
      : name === "context"
        ? ["clear"]
        : ["web", "enhance"].includes(name)
          ? ["status", "on", "off"]
          : name === "compare"
            ? ["chrome firefox", "cache cookies"]
            : name === "model"
              ? ["gamma", "madon", "status", "unload"]
              : name === "think"
                ? ["auto", "on", "off"]
                : name === "theme"
                  ? ["light", "dark", "system"]
                  : name === "tabs"
                    ? ["pin", "unpin"]
                    : [],
  permission: ["tab", "tabs", "page", "reader"].includes(name)
    ? "Explicit activeTab action"
    : "None",
}));
export function parseCommand(input: string) {
  const m = input.trim().match(/^(?:run\s+)?\/([a-z]+)(?:\s+(.*))?$/i);
  if (!m) return null;
  return { name: m[1].toLowerCase(), arg: m[2]?.trim().toLowerCase() ?? "" };
}
export async function executeCommand(
  name: string,
  arg: string,
  context: Context,
  facts: Evidence[],
  extension?: (name: string, arg: string) => Promise<string>,
  preferences: { webSources?: boolean; enhanced?: boolean } = {},
): Promise<Response> {
  const result = (text: string, extra: Partial<Response> = {}): Response => ({
    text,
    context,
    ...extra,
  });
  if (name === "model") arg = String(normalizeModel(arg));
  const cmd = commands.find((c) => c.name === name);
  if (!cmd)
    return result(
      `Unknown command /${name}. Use /help for the allowlisted commands.`,
    );
  if (
    cmd.args.length &&
    !cmd.args.includes(arg) &&
    !(["model", "diagnose", "context", "web", "enhance"].includes(name) && !arg)
  )
    return result(`Use /${name} ${cmd.args.join(" | ")}.`);
  if (!cmd.args.length && arg)
    return result(`/${name} does not accept arguments.`);
  if (name === "gamma")
    return result(
      "**Gamma 2.0** — Fast, private browser and device intelligence. Local authored guidance, lexical retrieval, diagnostic graphs, and optional CPU embeddings. Madon is a separate generative model; Gamma never downloads or invokes it automatically.",
    );
  if (name === "health") return result(health(facts), { evidence: facts });
  if (name === "context")
    return arg === "clear"
      ? result("Temporary context cleared. Saved messages are preserved.", {
          context: emptyContext(),
        })
      : result(
          `Topic: ${context.intent ?? "none"}. Stated browser: ${context.browser ?? "none"}. Diagnostic: ${context.diagnosis?.id ?? context.flow?.id ?? "none"}. Remembered checks: ${context.attempted.length}.`,
        );
  if (name === "explain")
    return result(
      context.lastAction
        ? `Last recommendation: ${context.lastAction}\n\nThis reversible comparison narrows possible causes; it does not establish a measured diagnosis.`
        : "No recommendation is active. Start a diagnostic question first.",
    );
  if (name === "sources")
    return result(
      context.sources?.length
        ? "Sources from the most recent public lookup are attached."
        : "No public sources have been retrieved in this context.",
      { sources: context.sources },
    );
  if (name === "web")
    return result(
      arg === "on"
        ? "Public web retrieval enabled. Explicit lookup requests send a short public topic to Wikimedia. History and diagnostics are not sent. Use /web off to disable."
        : arg === "off"
          ? "Web retrieval disabled. Bundled knowledge remains available."
          : `Web retrieval is ${preferences.webSources ? "on" : "off"}.`,
      arg === "on" || arg === "off"
        ? { effect: { type: "web", value: arg } }
        : {},
    );
  if (name === "enhance")
    return result(
      arg === "on"
        ? "Open Enhanced understanding in Settings to review the download and explicitly consent."
        : arg === "off"
          ? "Enhanced understanding disabled. Built-in matching remains available."
          : semantic.getSnapshot().detail,
      arg === "on" || arg === "off"
        ? { effect: { type: "enhance", value: arg } }
        : {},
    );
  if (name === "compare")
    return result(
      arg === "cache cookies"
        ? "Cache stores reusable resources. Cookies store small request-associated values, including sign-in state. Clearing cookies can sign you out; clearing cache can force resource downloads."
        : knowledge.find((k) => k.id === "compare")!.answer,
    );
  if (name === "diagnose" && arg) {
    if (arg === "stop") {
      context.diagnosis = undefined;
      context.flow = undefined;
      context.lastAction = undefined;
      context.attempted = [];
      return result("Diagnostic session stopped.");
    }
    if (arg === "status")
      return result(
        context.diagnosis
          ? `Workflow: ${context.diagnosis.id}. Node: ${context.diagnosis.node}. Outcome: ${context.diagnosis.outcome ?? "in progress"}. Answers: ${context.diagnosis.history.length}.`
          : context.flow
            ? `Legacy workflow: ${context.flow.id}, step ${context.flow.step + 1}.`
            : "No active diagnostic session.",
      );
    const id = context.diagnosis?.id ?? context.flow?.id;
    if (id) {
      context.attempted = [];
      context.lastAction = undefined;
      return (
        begin(id, context) ?? result("This diagnostic is no longer available.")
      );
    }
    return result("Start a diagnostic question before restarting.");
  }
  if (cmd.extension) {
    if (!extension)
      return result(
        `/${name} requires the Varek Chromium extension and a deliberate action on a permitted tab. The website cannot access your other tabs or page contents.`,
      );
    return result(await extension(name, arg));
  }
  if (name === "help")
    return result(
      commands
        .map(
          (c) =>
            `- **/${c.name}**${c.args.length ? " " + c.args.join(" | ") : ""} — ${c.description}`,
        )
        .join("\n"),
    );
  if (name === "theme" || name === "think")
    return result(
      `${name === "theme" ? "Appearance" : "Thinking"} set to ${arg}.`,
      { effect: { type: name, value: arg } },
    );
  if (["new", "clear", "export"].includes(name))
    return result(
      name === "clear"
        ? "Clear this conversation only after confirming."
        : name === "new"
          ? "Starting a new conversation."
          : "Preparing this conversation for local export.",
      { effect: { type: name as "new" | "clear" | "export" } },
    );
  if (name === "model")
    return result(
      arg === "gamma" || arg === "madon"
        ? `Selected ${arg === "gamma" ? "Gamma" : "Madon"}. Madon requires explicit setup before generation.`
        : arg === "unload"
          ? "Unloading Madon from memory; cached assets are retained."
          : "**Gamma** — local knowledge and diagnostics.\n\n**Madon** — local Qwen3 AI on compatible website devices. Use /model madon to open setup.",
      { effect: { type: "model", value: arg || "status" } },
    );
  if (name === "shortcuts")
    return result(
      "Alt+N: new chat\n\nAlt+K: focus composer\n\nAlt+B: toggle sidebar\n\nAlt+F: search conversations\n\nEnter: send · Shift+Enter: newline · Escape: close menu or dialog",
    );
  if (name === "features" || name === "compatibility")
    return result(
      Object.entries(features())
        .map(([k, v]) => `- ${k}: ${v ? "supported" : "unavailable"}`)
        .join("\n"),
    );
  if (name === "diagnose")
    return result(
      "What needs troubleshooting: a slow browser, a website that will not open, crashes, sign-in, audio, video, connectivity, or heat?",
      {
        followups: [
          "My browser is slow",
          "Website will not open",
          "Browser keeps crashing",
        ],
      },
    );
  const groups: Record<string, string[]> = {
    browser: ["Browser"],
    device: ["Device"],
    system: ["Device"],
    screen: ["Display"],
    language: ["Language", "Languages"],
    timezone: ["Time zone"],
    permissions: ["Permissions"],
    storage: ["Storage"],
    network: ["Network"],
    performance: ["Device", "Network"],
  };
  if (groups[name]) {
    const evidence = facts.filter(
      (f) => groups[name].includes(f.group) || groups[name].includes(f.label),
    );
    const suffix =
      name === "performance"
        ? knowledge.find((k) => k.id === "slow")!.answer
        : name === "system"
          ? "A website cannot inspect system processes, physical memory utilization, temperatures, or installed apps."
          : "Values are browser-reported. Estimates are not exact hardware measurements; an online hint is not a reachability test.";
    return result(suffix, {
      evidence,
      followups: name === "performance" ? ["Why is my browser slow?"] : [],
    });
  }
  const id: Record<string, string> = {
    security: "secure",
    extensions: "malicious-extension",
  };
  const k = knowledge.find((k) => k.id === (id[name] ?? name));
  return result(
    k?.answer ?? "This command is unavailable in this environment.",
  );
}
export const validThinking = (s: string): s is Thinking =>
  ["auto", "on", "off"].includes(s);
