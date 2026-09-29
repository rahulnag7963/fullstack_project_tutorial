import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Read the one shared .env file at the repository root.
  envDir: '..',
  // SECURITY: only variables starting with PUBLIC_ are bundled into browser code.
  // Everything else in .env (like the database password) stays off the browser.
  envPrefix: 'PUBLIC_',
  server: {
    port: 5173,
    strictPort: true,
    // Forward /api requests to the Express server, so the browser only talks to one address.
    proxy: { '/api': 'http://localhost:3001' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
