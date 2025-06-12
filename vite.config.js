import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: true, // Required for WebXR
    host: true,
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          mui: ["@mui/material", "@mui/icons-material"],
        },
      },
    },
  },
})
