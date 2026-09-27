import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.mts', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    /* 端口必须固定：OIDC 回调地址与 Host 精确匹配，端口漂移会导致登录失败 */
    port: 5273,
    strictPort: true,
    /* changeOrigin 必须为 false，否则代理会把 Host 改写成 127.0.0.1:8787，回调校验失败 */
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
});
