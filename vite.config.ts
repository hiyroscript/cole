import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  worker: { format: "es" },
  base: mode === "extension" ? "./" : "/cole/",
  build: {
    outDir: mode === "extension" ? "dist-extension" : "dist",
    sourcemap: false,
  },
  define: { __EXTENSION__: JSON.stringify(mode === "extension") },
}));
