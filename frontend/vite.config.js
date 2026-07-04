import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { cwd } from 'process'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '') // 读取同目录下的.env文件

  const targetUrl = env.VITE_API_BASE_URL || 'http://localhost:8080'
  const llmUrl = env.LLM_URL

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
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
        },
        '/api/llm': {
          target: llmUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/llm/, '')
        }
      }
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true
    }
  }
})
