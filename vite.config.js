// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
// import { imagetools } from 'vite-imagetools'; // Comentado temporalmente
// import imagePresets from 'vite-plugin-image-presets'; // Comentado temporalmente
import Pages from 'vite-plugin-pages';
import PagesSitemap from 'vite-plugin-pages-sitemap';
import Sitemap from 'vite-plugin-sitemap';

export default defineConfig({
  plugins: [
    react(),
    // imagetools(), // Comentado temporalmente
    // imagePresets({ // Comentado temporalmente
    //   responsive: {
    //     formats: ['webp', 'jpeg'],
    //     widths: [480, 768, 1024, 1440],
    //     sizes: '100vw',
    //   },
    // }),
    Pages(),
    PagesSitemap({
      hostname: 'https://www.grupodte.com',
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
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Code splitting agresivo para reducir bundle inicial
        manualChunks: {
          // Vendor crítico - carga primero
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animaciones - carga diferida
          'vendor-animations': ['framer-motion', 'gsap'],
          // i18n - carga diferida
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // UI libs
          'vendor-ui': ['lucide-react', 'swiper'],
          // Supabase/Auth
          'vendor-backend': ['@supabase/supabase-js', '@react-oauth/google'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'gsap'
    ],
  },
});