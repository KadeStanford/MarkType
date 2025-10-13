import { defineConfig } from "vite";

// Basic Vite config without React plugin to avoid ESM-only plugin loading issues on some systems.
export default defineConfig({
  server: {
    port: 5173,
  },
});
