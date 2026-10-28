import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/town-marble/",
  plugins: [react()],
  server: {
    proxy: {
      "/town-marble/socket": { target: "ws://127.0.0.1:5188", ws: true },
    },
  },
  build: { outDir: "../public/town-marble", emptyOutDir: true },
});
