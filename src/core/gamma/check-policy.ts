export type CheckAssessment = {
  risk: "read-only" | "temporary-change" | "persistent-change";
  reason: string;
  preparation: string;
  interpretation: string;
};
export function assessCheck(text: string): CheckAssessment {
  const persistent = /\b(?:reset|delete|clear|remove|uninstall|format)\b/i.test(
    text,
  );
  const temporary =
    /\b(?:temporary|disable|toggle|turn off|switch|restart|close)\b/i.test(
      text,
    );
  const reason = /profile|extension/i.test(text)
    ? "A controlled profile or extension comparison helps separate profile-specific behavior from a problem shared by the same workload."
    : /acceleration|gpu/i.test(text)
      ? "Comparing graphics settings tests whether the rendering path changes the symptom; it cannot establish a hardware defect."
      : /task manager|cpu|memory|resource/i.test(text)
        ? "Observing resource use while reproducing the symptom distinguishes sustained pressure from an idle-system problem."
        : /network|connection|dns/i.test(text)
          ? "Comparing reachability under the same conditions helps distinguish connection-wide failures from one application's behavior."
          : "Record the result under the same workload so the next check can use an actual observation rather than a guessed cause.";
  return {
    risk: persistent
      ? "persistent-change"
      : temporary
        ? "temporary-change"
        : "read-only",
    reason,
    preparation: temporary
      ? "Save unfinished work, record the original setting, and restore it after the comparison."
      : "Record the current symptom and conditions before checking.",
    interpretation:
      "If it improves, the changed condition becomes relevant evidence. If unchanged, that check has not isolated the cause. Neither outcome proves a root cause.",
  };
}
export function excludedCheck(text: string, constraints: string[]): boolean {
  // Destructive/persistent steps must never be called reversible or offered as
  // automatic diagnostic checks. They need a separate, specific user request.
  if (assessCheck(text).risk === "persistent-change") return true;
  return constraints.some((constraint) => {
    const n = constraint.toLowerCase().replace(/[’']/g, "");
    if (!/without|avoid|dont|do not|cannot|cant|keep|preserve/.test(n))
      return false;
    if (
      /data|files|history|cookies|profile/.test(n) &&
      /clear|delete|reset|remove|uninstall/.test(text.toLowerCase())
    )
      return true;
    return ["install", "disable", "restart", "close", "switch"].some(
      (action) => n.includes(action) && text.toLowerCase().includes(action),
    );
  });
}
