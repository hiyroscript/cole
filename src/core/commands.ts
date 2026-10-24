import type { Response, Context, Thinking, Evidence } from "./types";
import { knowledge } from "../data/knowledge";
import { features } from "../lib/diagnostics";
export const commands = [
  ["help", "Show available commands"],
  ["about", "About Varek and Zulvyn"],
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
    name === "think"
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
): Promise<Response> {
  const result = (text: string, extra: Partial<Response> = {}): Response => ({
    text,
    context,
    ...extra,
  });
  const cmd = commands.find((c) => c.name === name);
  if (!cmd)
    return result(
      `Unknown command /${name}. Use /help for the allowlisted commands.`,
    );
  if (cmd.args.length && !cmd.args.includes(arg))
    return result(`Use /${name} ${cmd.args.join(" | ")}.`);
  if (!cmd.args.length && arg)
    return result(`/${name} does not accept arguments.`);
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
      "**Zulvyn** — available. Local browser and device intelligence.\n\n**Madon** — coming soon; not selectable.",
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
