import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/Live-Timing-Dashboard/",
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      "/api/nls-live-en": {
        target: "https://www.nuerburgring-langstrecken-serie.de",
        changeOrigin: true,
        rewrite: () => "/language/en/live/",
        followRedirects: false,
      },
      "/api/nls-live-de": {
        target: "https://www.nuerburgring-langstrecken-serie.de",
        changeOrigin: true,
        rewrite: () => "/language/de/live/",
        followRedirects: false,
      },
      "/api/nls-ticker": {
        target: "https://www.nuerburgring-langstrecken-serie.de",
        changeOrigin: true,
        rewrite: () => "/wp-content/themes/pofo-child/liveticker.php",
      },
    },
  },
});
