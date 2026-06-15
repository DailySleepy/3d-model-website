import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { cwd } from 'process'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '') // 读取同目录下的.env文件

  const targetUrl = env.VITE_API_BASE_URL || 'http://121.89.92.133' // 如果没有配置.env, 则fallback到云服务器

  return {
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
        },
        '/api/llm': {
          target: 'http://127.0.0.1:55557/v1',
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
