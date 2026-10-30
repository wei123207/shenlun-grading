import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      // 百度 OCR 代理（解决跨域）
      '/baidu-ocr': {
        target: 'https://aip.baidubce.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/baidu-ocr/, '')
      },
      // 智谱清言 AI 代理（解决跨域）
      '/zhipu-ai': {
        target: 'https://open.bigmodel.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zhipu-ai/, '')
      },
      // Supabase 代理（解决跨域）
      '/supabase': {
        target: 'https://hcjqxbknumjvkwzakgqj.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase/, '')
      },
      // CloudBase 云函数代理
      '/api': {
        target: 'https://shenlun-d4gplnd59018378c0-1473604851.ap-shanghai.app.tcloudbase.com',
        changeOrigin: true
      }
    }
  }
})
