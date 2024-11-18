import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ensure Vite is installed
// Run the following command in your terminal:
// npm install vite --save-dev
// If using TypeScript, also install types:
// npm install @types/vite --save-dev

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  assetsInclude: ['**/*.mp3'], // Add support for MP3 files
  build: {
    rollupOptions: {
      external: ['src/main.tsx']
    }
  }
});



