import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      "@dungeonforge/engine": path.resolve(__dirname, "../../packages/engine/src/index.ts"),
      "@dungeonforge/renderer": path.resolve(__dirname, "../../packages/renderer/src/index.ts"),
      "@dungeonforge/narrative": path.resolve(__dirname, "../../packages/narrative/src/index.ts"),
      "@dungeonforge/character-engine": path.resolve(__dirname, "../../packages/character-engine/src/index.ts"),
      "@dungeonforge/play-engine": path.resolve(__dirname, "../../packages/play-engine/src/index.ts"),
      "@dungeonforge/rules-engine": path.resolve(__dirname, "../../packages/rules-engine/src/index.ts"),
    },
  },
});
