import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './',
  publicDir: '../public',
  server: {
    port: 3001,
    open: false,
    host: true
  },
  build: {
    outDir: '../dist/master',
    sourcemap: true,
    rollupOptions: {
      input: {
        master: resolve(__dirname, 'index.html')
      }
    }
  }
});
