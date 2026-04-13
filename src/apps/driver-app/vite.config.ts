import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5174,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true,
            },
            '/tracking-socket': {
                target: 'http://localhost:3000',
                ws: true,
            },
            '/ws': {
                // Driver-service Socket.IO path - must point to port 3004
                target: 'http://localhost:3004',
                ws: true,
                changeOrigin: true,
            },
        },
    },
})
