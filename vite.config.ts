/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Main build: the options page (an HTML entry) plus everything in public/
// (manifest.json + icons) which Vite copies to the output directory verbatim.
// The content script is built separately by vite.content.config.ts so it can be
// emitted as a single self-contained IIFE file (MV3 content scripts are classic
// scripts and cannot use ES module imports at runtime).
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    // The options page is a single self-contained bundle with no code-splitting,
    // so no module preloads are needed. Dropping the polyfill removes the only
    // fetch() reference from the shipped extension (it would only ever load local
    // chunks, but a zero-network bundle is cleaner for store review).
    modulePreload: false,
    rollupOptions: {
      input: {
        options: resolve(__dirname, "options.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
