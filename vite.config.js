import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 4000,
    // FIX: убраны manualChunks — они конфликтовали с Vercel
    rollupOptions: {
      output: {
        // Один большой бандл надёжнее чем chunks для Telegram Mini App
        inlineDynamicImports: false,
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
