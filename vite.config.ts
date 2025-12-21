import { defineConfig } from 'vite';

export default defineConfig({
  // 使用相对路径作为 base，这样部署到 GitHub Pages 时更稳健
  base: './',
  build: {
    outDir: 'dist',
  }
});