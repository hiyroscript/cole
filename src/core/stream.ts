export async function stream(
  text: string,
  onChunk: (value: string) => void,
  signal: AbortSignal,
  reduced = false,
) {
  if (text.length < 180) {
    if (signal.aborted) return false;
    onChunk(text);
    return !signal.aborted;
  }
  const parts = Array.from(text);
  let count = 0;
  while (count < parts.length) {
    if (signal.aborted) return false;
    count = Math.min(
      parts.length,
      count +
        (reduced ? parts.length : Math.max(24, Math.ceil(parts.length / 24))),
    );
    onChunk(parts.slice(0, count).join(""));
    if (count < parts.length)
      await new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          signal.removeEventListener("abort", done);
          resolve();
        };
        const timer = setTimeout(done, 16 + (count % 3) * 7);
        signal.addEventListener("abort", done, { once: true });
      });
  }
  return !signal.aborted;
}
