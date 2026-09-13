import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    host: true, // Listens on 0.0.0.0 so phone and local network can access
    port: 3000,
    open: true,
  }
});
