import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: O base deve corresponder ao nome do seu repositório no GitHub
  // Isso garante que os assets (js/css) sejam carregados do caminho correto
  base: '/Nosso-Lar-2/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});