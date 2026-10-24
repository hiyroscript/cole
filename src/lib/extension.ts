export const isExtension = () =>
  typeof chrome !== "undefined" && !!chrome.runtime?.id;
export function validExtensionRequest(
  value: unknown,
): value is { type: "VAREK_ACTION"; name: string; arg: string } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.type === "VAREK_ACTION" &&
    typeof v.name === "string" &&
    ["tab", "tabs", "page", "reader", "sidepanel"].includes(v.name) &&
    typeof v.arg === "string" &&
    (v.name === "tabs" ? ["pin", "unpin"].includes(v.arg) : v.arg === "")
  );
}
export async function extensionAction(name: string, arg: string) {
  if (
    ["page", "reader", "tab"].includes(name) &&
    !window.confirm(
      `${name === "reader" ? "Extract up to 12,000 characters of visible page text" : "Read the current page’s " + (name === "page" ? "metadata" : "title and URL")} into this local chat? This may contain personal information.`,
    )
  )
    return "Page access cancelled. No page content was read.";
  const response = await chrome.runtime.sendMessage({
    type: "VAREK_ACTION",
    name,
    arg,
  });
  if (!response || typeof response.text !== "string")
    throw new Error("Invalid extension response");
  return response.text;
}
