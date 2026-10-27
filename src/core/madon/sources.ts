export type Source = {
  title: string;
  url: string;
  text: string;
  updatedAt?: string;
};
export function validSource(value: unknown): value is Source {
  if (!value || typeof value !== "object") return false;
  const s = value as Source;
  if (
    typeof s.title !== "string" ||
    !s.title ||
    s.title.length > 300 ||
    typeof s.text !== "string" ||
    s.text.length > 2000 ||
    typeof s.url !== "string" ||
    (s.updatedAt !== undefined &&
      (typeof s.updatedAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T/.test(s.updatedAt) ||
        !Number.isFinite(Date.parse(s.updatedAt))))
  )
    return false;
  try {
    const u = new URL(s.url);
    return (
      u.protocol === "https:" &&
      ((u.hostname === "en.wikipedia.org" && u.pathname.startsWith("/wiki/")) ||
        (u.hostname === "github.com" &&
          /^\/mdn\/browser-compat-data\/blob\/[a-f0-9]{40}\/(?:api\/(?:GPU|WebGLRenderingContext|ServiceWorker|IDBFactory)|javascript\/builtins\/WebAssembly)\.json$/.test(
            u.pathname,
          ))) &&
      !u.username &&
      !u.password &&
      !u.port
    );
  } catch {
    return false;
  }
}
