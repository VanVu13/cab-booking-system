import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // API Gateway
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, '') // Remove /api/v1 prefix to match Gateway routes
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      },
      '/tracking-socket': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
})
