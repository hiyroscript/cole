import { features } from "../../lib/diagnostics";
export type Probe = {
  feature: string;
  state: "exposed" | "unavailable" | "tested" | "failed" | "denied" | "unknown";
  detail: string;
};
export async function probe(
  feature: string,
  signal?: AbortSignal,
): Promise<Probe> {
  signal?.throwIfAborted();
  if (feature !== "webgpu")
    return {
      feature,
      state: "unknown",
      detail:
        "Only the explicit WebGPU adapter probe is supported; /health lists other exposed APIs.",
    };
  if (!features().WebGPU)
    return {
      feature,
      state: "unavailable",
      detail: "WebGPU API is not exposed in this environment.",
    };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const adapter = await Promise.race([
      navigator.gpu.requestAdapter(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 3000);
      }),
    ]);
    signal?.throwIfAborted();
    return adapter
      ? {
          feature,
          state: "tested",
          detail:
            "requestAdapter returned an adapter. No GPU device, model execution, graphics workload or available memory was measured.",
        }
      : {
          feature,
          state: "failed",
          detail:
            "No adapter was obtained within three seconds. API exposure does not establish working device/driver support.",
        };
  } catch (error) {
    signal?.throwIfAborted();
    return {
      feature,
      state: "failed",
      detail:
        error instanceof Error ? error.message : "Adapter operation failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}
