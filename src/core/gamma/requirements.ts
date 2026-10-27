export type ExecutionRequirement = {
  kind: "measurement" | "mutation" | "current-source" | "access";
  target: string;
};
// Classify the requested operation before treating nearby knowledge as an
// answer. Educational “how do I ...” questions are not execution requests.
export function executionRequirement(
  input: string,
): ExecutionRequirement | undefined {
  const text = input
    .trim()
    .replace(/^(?:please\s+)?(?:(?:can|could|would) you\s+)?/i, "");
  const measure = text.match(/^(?:measure|monitor)\s+(.+)/i);
  if (measure) return { kind: "measurement", target: measure[1] };
  const access = text.match(
    /^(?:read(?!\s+about\b)|access|fetch|scan|upload|send|download)\s+(.+)/i,
  );
  if (access) return { kind: "access", target: access[1] };
  const mutate = text.match(
    /^(?:change|set|adjust|delete|erase|wipe|install|uninstall|disable|enable|restart|reboot|terminate)\s+(.+)/i,
  );
  if (mutate) return { kind: "mutation", target: mutate[1] };
  if (
    /\b(?:latest|up.to.date|as of today)\b/i.test(text) ||
    /\bcurrent\s+(?:(?:supported|stable|complete)\s+)?(?:list|version|release|advisories|prices|news)\b/i.test(
      text,
    )
  )
    return { kind: "current-source", target: text };
}
export function unmetRequirement(requirement: ExecutionRequirement): string {
  switch (requirement.kind) {
    case "access":
      return "I cannot perform that data-access operation from this request. Use a supported explicit command or select a local document for analysis. No private files, credentials or account data were accessed or transferred.";
    case "measurement":
      return "I cannot perform that measurement from this chat. Use /device, /screen, /storage or /network for the limited browser observations available here. System load, free graphics memory and hardware temperatures need an operating-system or vendor tool.";
    case "mutation":
      return "I cannot change device or browser settings directly from this conversation. Use /help for the supported explicit commands, or ask how to make the specific change yourself. No setting was changed.";
    case "current-source":
      return "I cannot verify current information from offline authored guidance. Use an official current source, or explicitly enable web sources and request /research with a short public topic. Wikimedia may not cover the latest technical releases; a retrieval date alone does not prove freshness.";
  }
}
