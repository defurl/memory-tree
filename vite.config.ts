import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "::",
    port: 8081, // Use 8081 to avoid conflict with existing app
  },
  optimizeDeps: {
    exclude: ["@mediapipe/hands", "@mediapipe/camera_utils"],
  },
}));
