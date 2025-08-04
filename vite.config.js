// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { imagetools } from 'vite-imagetools';
import imagePresets from 'vite-plugin-image-presets';
import Pages from 'vite-plugin-pages';
import PagesSitemap from 'vite-plugin-pages-sitemap';
import Sitemap from 'vite-plugin-sitemap';



export default defineConfig({
  plugins: [
    react(),
    imagetools(),
    imagePresets({
      responsive: {
        formats: ['webp', 'jpeg'],
        widths: [480, 768, 1024, 1440],
        sizes: '100vw',
      },
    }),
    Pages(),
    PagesSitemap({
      hostname: 'https://www.grupodte.com', // ✅ Cambiar a tu dominio final
      exclude: ['/404'],
    }),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),

    Sitemap({
      hostname: 'https://www.grupodte.com',
      routes: [
        '/',
        '/Nosotros',
        '/Contacto',
        '/servicios',
        '/despega',
        '/tyc',
        '/politica-privacidad'
      ],
    }),
    
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['framer-motion'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('/src/components/')) return 'components';
          if (id.includes('/src/pages/')) return 'pages';
          if (id.includes('/src/utils/')) return 'utils';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'gsap', 'framer-motion/dist/framer-motion'],
  },
});
