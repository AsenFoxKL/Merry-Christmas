import { defineConfig } from 'vite';

export default defineConfig({
  // 必须配置 base，否则 GitHub Pages 的路径会错
  base: '/particle-christmas-tree/', 
  build: {
    outDir: 'dist',
  }
});