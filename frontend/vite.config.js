import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import process from 'node:process'

const targetUrl = process.env.BASE_URL || 'http://localhost:8080'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    '__API_URL__': JSON.stringify(targetUrl) // vue 中使用这个作为后端地址
  },
  server: {
    proxy: {
      '/api': {
        target: targetUrl,
        changeOrigin: true
      },
      '/uploads': {
        target: targetUrl,
        changeOrigin: true
      },
      '/ws': {
        target: targetUrl,
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})
