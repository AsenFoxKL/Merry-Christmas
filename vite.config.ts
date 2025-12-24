import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 部署配置：
// 如果部署到 https://username.github.io/repo-name/，设置 base: '/repo-name/'
// 如果部署到根域名 https://username.github.io/，保持 base: '/'
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/Merry-Christmas/' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});