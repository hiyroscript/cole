import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  worker: { format: "es" },
  base: mode === "extension" ? "./" : "/cole/",
  build: {
    outDir: mode === "extension" ? "dist-extension" : "dist",
    sourcemap: false,
    manifest: true,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.endsWith("/src/core/gamma/engine.ts")) return "gamma-core";
          const match = id.match(/\/src\/data\/packs\/([^/]+)\.ts$/);
          if (match && match[1] !== "schema") return "pack-" + match[1];
        },
      },
    },
  },
  define: { __EXTENSION__: JSON.stringify(mode === "extension") },
}));
