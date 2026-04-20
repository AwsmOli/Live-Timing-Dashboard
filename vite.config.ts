import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/Live-Timing-Dashboard/",
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "NLS Live Timing",
        short_name: "NLS Timing",
        description: "Nürburgring Langstrecken-Serie live timing dashboard",
        theme_color: "#0a0a0f",
        background_color: "#0a0a0f",
        display: "standalone",
        orientation: "any",
        scope: "/Live-Timing-Dashboard/",
        start_url: "/Live-Timing-Dashboard/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
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
