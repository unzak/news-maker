import { defineConfig } from "vite";

export default defineConfig({
  // Rutas relativas: la build funciona en GitHub Pages y abriendo el HTML directamente.
  base: "./",
  build: {
    // El overlay debe quedar como archivo, no inline en base64.
    assetsInlineLimit: 4096,
  },
});
