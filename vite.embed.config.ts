import { defineConfig } from "vite";
// the embeddable runtime: one iife file exposing window.ident, copied into the app's public/
// so the main build ships it at /embed/ident.js
export default defineConfig({
  publicDir: false,
  build: {
    lib: { entry: "src/embed/runtime.ts", name: "ident", formats: ["iife"], fileName: () => "ident.js" },
    outDir: "public/embed",
    emptyOutDir: true,
    minify: true,
  },
});
