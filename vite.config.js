import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: true, // Required for camera access
    host: "0.0.0.0", // Allow external connections
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          three: ["three"],
          mui: ["@mui/material", "@mui/icons-material"],
        },
      },
    },
  },
})
