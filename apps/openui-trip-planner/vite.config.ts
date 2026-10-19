import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { chatPlugin } from "./server/chat-plugin.ts";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), chatPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
