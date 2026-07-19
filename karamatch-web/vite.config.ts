import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API = process.env.KARAMATCH_API || "http://localhost:3000";

// Proxy the API and its static image mounts so the app is same-origin in dev.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": { target: API, changeOrigin: true },
            "/uploads": { target: API, changeOrigin: true },
            "/venues": { target: API, changeOrigin: true },
            "/avatars": { target: API, changeOrigin: true }
        }
    }
});
