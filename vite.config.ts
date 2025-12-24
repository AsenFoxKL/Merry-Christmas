import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Merry-Christmas/',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});