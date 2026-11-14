import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves the site under /aether/, so only the production build uses that base.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/aether/" : "/",
  plugins: [react(), tailwindcss()],
}));
