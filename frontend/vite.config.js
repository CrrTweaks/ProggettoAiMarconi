import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    // If 5173 is busy (zombie process, other dev server, …) just take the next free one.
    strictPort: false,
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
  },
});
