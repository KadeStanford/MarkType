import { defineConfig } from "vite";

// Basic Vite config without React plugin to avoid ESM-only plugin loading issues on some systems.
// For Electron packaging, set base to './' so assets resolve under file:// protocol,
// and write the renderer build to a separate folder to avoid conflicts with electron-builder output.
export default defineConfig({
  base: "./",
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist-web",
    emptyOutDir: true,
  },
});
