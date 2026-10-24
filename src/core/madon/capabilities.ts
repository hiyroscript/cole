import { isExtension } from "../../lib/extension";
export type Capability = {
  supported: boolean;
  detail: string;
  webgpu: boolean;
  storage?: number;
};
export async function checkCapabilities(): Promise<Capability> {
  if (isExtension())
    return {
      supported: false,
      webgpu: false,
      detail:
        "Madon is website-only. This extension retains Zulvyn; remote model WebAssembly is not permitted by its security policy.",
    };
  if (!globalThis.isSecureContext)
    return {
      supported: false,
      webgpu: false,
      detail: "Madon requires HTTPS or localhost.",
    };
  if (!navigator.gpu)
    return {
      supported: false,
      webgpu: false,
      detail:
        "WebGPU is unavailable. Use a WebGPU-capable browser and device, or switch to Zulvyn.",
    };
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter)
      return {
        supported: false,
        webgpu: true,
        detail:
          "No WebGPU adapter is available. Check browser graphics settings or use Zulvyn.",
      };
    if (!adapter.features.has("shader-f16"))
      return {
        supported: false,
        webgpu: true,
        detail:
          "This GPU does not support shader-f16, which this model requires.",
      };
    // WebLLM requests at least 128 MiB storage buffers. Runtime checks the actual model too.
    if (
      adapter.limits.maxStorageBufferBindingSize < 128 * 1024 ** 2 ||
      adapter.limits.maxBufferSize < 256 * 1024 ** 2
    )
      return {
        supported: false,
        webgpu: true,
        detail: "GPU buffer limits are too small for Madon.",
      };
    let storage: number | undefined;
    try {
      const s = await navigator.storage?.estimate();
      if (s?.quota !== undefined)
        storage = Math.max(0, s.quota - (s.usage ?? 0));
    } catch {
      /* optional estimate */
    }
    return {
      supported: true,
      webgpu: true,
      storage,
      detail:
        "Compatibility checks passed. Initialization must still verify graphics memory and driver support.",
    };
  } catch (e) {
    return {
      supported: false,
      webgpu: true,
      detail: `GPU check failed: ${e instanceof Error ? e.message : "Adapter unavailable"}`,
    };
  }
}
