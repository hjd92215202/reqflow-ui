// vite.config.js
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
  // 核心修改：Tauri 专属配置
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true, // Tauri 需要严格锁定端口
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  // 这些环境变量用于让 Vite 读取 Tauri 的环境信息
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Tauri 期望输出的目录（与 tauri.conf.json 中保持一致）
    outDir: 'dist',
    // 调试模式下生成 sourcemap
    sourcemap: !!process.env.TAURI_DEBUG,
  }
})