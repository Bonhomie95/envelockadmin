import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The admin console is a SEPARATE app from client/ — its own build, its own
// origin. Port 5174 (client is 5173). It proxies /api to the same backend, so
// there is no cross-origin call in dev.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
     "/api": "https://envelockserver.onrender.com",
      "/health": "https://envelockserver.onrender.com",
    },
  },
});
