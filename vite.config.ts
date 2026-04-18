import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/Live-Timing-Dashboard/",
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      "/api/nls-live": {
        target: "https://www.nuerburgring-langstrecken-serie.de",
        changeOrigin: true,
        rewrite: (path) => "/language/en/live/",
        followRedirects: false,
      },
    },
  },
});
