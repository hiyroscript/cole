// Compatibility is limited to metadata. Never rewrite user-authored text.
export const normalizeModel = (id: unknown) => (id === "zulvyn" ? "gamma" : id);
