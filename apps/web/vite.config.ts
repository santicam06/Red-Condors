import { defineConfig, normalizePath } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { fileURLToPath } from 'node:url';

const cesiumSource = normalizePath(
  fileURLToPath(new URL('../../node_modules/cesium/Build/Cesium', import.meta.url))
);
const cesiumBaseUrl = 'cesium';

// Forward /api/* to the FastAPI backend so the frontend always uses relative URLs.
const apiProxy = {
  '/api': {
    target: process.env.API_URL ?? 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
};

export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}`),
  },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl },
      ],
    }),
  ],
});
