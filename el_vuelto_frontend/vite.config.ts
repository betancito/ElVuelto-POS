import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  publicDir: 'assets',
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    // Forward /api requests to the local Django backend so the frontend can
    // use same-origin URLs. This makes the app work both at localhost:5173
    // (Vite directly) and at 192.168.1.9:5173 (via the nginx reverse proxy)
    // without CORS configuration or hardcoded host/IP in the bundle.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
