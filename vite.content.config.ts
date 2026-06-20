import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Content-script build. MV3 declarative content scripts are injected as classic
// scripts, so the output must be a single file with no runtime import/export.
// Library mode with the IIFE format + inlineDynamicImports guarantees exactly
// one self-contained `content.js`. CSS is imported with `?inline` in the source,
// so it is bundled as a string (no separate .css asset to inject).
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist",
    // Do not wipe the dist/ produced by the main (options) build.
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, "src/content/index.tsx"),
      name: "ClaudeUsagePace",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        // Should not emit, but keep a stable name just in case.
        assetFileNames: "content.[ext]",
      },
    },
  },
});
