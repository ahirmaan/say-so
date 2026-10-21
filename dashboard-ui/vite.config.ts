import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' so built asset URLs are relative - this is loaded via
// Electron's loadFile() (file:// protocol), not a web server.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
