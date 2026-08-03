import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.svg",
        "robots.txt",
      ],

      manifest: {
        name: "ChatBot AI",
        short_name: "ChatBot",
        description: "AI Chatbot with RAG, Code Generation and Code Explanation",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",

        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],

  build: {
    outDir: "dist",
  },
});