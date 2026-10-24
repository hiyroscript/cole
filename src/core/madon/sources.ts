export type Source = { title: string; url: string; text: string };
export function validSource(value: unknown): value is Source {
  if (!value || typeof value !== "object") return false;
  const s = value as Source;
  if (
    typeof s.title !== "string" ||
    !s.title ||
    s.title.length > 300 ||
    typeof s.text !== "string" ||
    s.text.length > 2000 ||
    typeof s.url !== "string"
  )
    return false;
  try {
    const u = new URL(s.url);
    return (
      u.protocol === "https:" &&
      u.hostname === "en.wikipedia.org" &&
      !u.username &&
      !u.password &&
      !u.port &&
      u.pathname.startsWith("/wiki/")
    );
  } catch {
    return false;
  }
}
