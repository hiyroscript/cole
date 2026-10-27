export const commands = [
  [
    "deep",
    "Experimental local draft: status, off, clear, or a supported topic",
  ],
  ["stats", "Descriptive statistics for supplied numbers"],
  ["csv", "Analyze supplied CSV rows and numeric columns"],
  ["text", "Count words, Unicode characters, bytes and lines"],
  ["diff", "Compare JSON {before, after} text"],
  ["logic", "Deduce from JSON facts and if/then rules"],
  ["probe", "Explicit local capability operation: webgpu"],
  ["research", "Explicit public lookup; clear removes cached public extracts"],
  ["memory", "Review, save, disable or clear explicit local preferences"],
  ["document", "Summary or passage search over the imported local document"],
  ["plan", "Plan reversible checks; resume switches suspended tasks"],
  ["reason", "Connect authored evidence for a topic"],
  ["summary", "Current task and diagnostic report"],
  ["knowledge", "Local coverage and optional packs: install or remove PACK"],
  ["calculate", "Arithmetic, percentages and unit conversions"],
  ["analyze", "Analyze explicitly supplied JSON or technical text"],
  ["capabilities", "List local calculation and analysis capabilities"],
  ["gamma", "Gamma engine and privacy information"],
  ["health", "Evidence-aware browser capability report"],
  ["context", "Temporary context: show or clear"],
  ["explain", "Explain the last recommended check"],
  ["sources", "Authored references or actual public lookup sources"],
  ["enhance", "Optional local understanding: status, on, off"],
  ["web", "Public source lookup: status, on, off"],
  ["compare", "Compare Chrome and Firefox, or cache and cookies"],
  ["help", "Show available commands"],
  ["about", "About Cole and Gamma"],
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
  const m = input.trim().match(/^(?:run\s+)?\/([a-z]+)(?:\s+([\s\S]*))?$/i);
  if (!m) return null;
  return {
    name: m[1].toLowerCase(),
    arg: [
      "calculate",
      "analyze",
      "document",
      "stats",
      "csv",
      "text",
      "diff",
      "logic",
      "deep",
    ].includes(m[1].toLowerCase())
      ? (m[2]?.trim() ?? "")
      : (m[2]?.trim().toLowerCase() ?? ""),
  };
}
