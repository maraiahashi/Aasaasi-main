// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  // Only VITE_* keys are loaded into the client bundle
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // If you DO NOT set VITE_API_URL, we proxy /api -> 127.0.0.1:8000
  // If you set VITE_API_URL (e.g. http://127.0.0.1:8000/api), the proxy is disabled
  const useProxy = !env.VITE_API_URL;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      open: false,
      proxy: useProxy
        ? {
            "/api": {
              target: "http://127.0.0.1:8000", // FastAPI
              changeOrigin: true,
              // keep path as-is; `/api/foo` -> `http://127.0.0.1:8000/api/foo`
            },
          }
        : undefined,
    },
    // Optional: `vite preview` behaves like dev locally
    preview: {
      port: 4173,
      proxy: useProxy
        ? {
            "/api": {
              target: "http://127.0.0.1:8000",
              changeOrigin: true,
            },
          }
        : undefined,
    },
    build: {
      outDir: "dist",
    },
  };
});
