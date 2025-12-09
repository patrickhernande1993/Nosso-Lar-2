import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Usar base relativa ('./') permite que o app funcione tanto na raiz (Vercel)
  // quanto em subpastas (GitHub Pages) sem precisar alterar o código.
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});