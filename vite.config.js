// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { visualizer } from 'rollup-plugin-visualizer';
// import { imagetools } from 'vite-imagetools'; // Comentado temporalmente
// import imagePresets from 'vite-plugin-image-presets'; // Comentado temporalmente
import Pages from 'vite-plugin-pages';
import PagesSitemap from 'vite-plugin-pages-sitemap';
import Sitemap from 'vite-plugin-sitemap';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const devApiPlugin = () => {
  const calHandlerUrl = pathToFileURL(path.resolve(__dirname, './api/cal/index.js')).href;

  const parseJsonBody = async (req) => {
    if (req.method === 'GET' || req.method === 'HEAD') return undefined;

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) return undefined;

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length === 0) return {};

    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return {};
    }
  };

  return {
    name: 'local-api-cal-handler',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;
        if (pathname !== '/api/cal' && !pathname.startsWith('/api/cal/')) {
          next();
          return;
        }

        try {
          const actionFromPath = pathname.startsWith('/api/cal/')
            ? pathname.slice('/api/cal/'.length)
            : null;

          req.query = Object.fromEntries(url.searchParams.entries());
          if (actionFromPath && !req.query.action) {
            req.query.action = actionFromPath;
          }
          req.body = await parseJsonBody(req);

          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (payload) => {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json');
            }
            res.end(JSON.stringify(payload));
            return res;
          };
          res.send = (payload) => {
            if (typeof payload === 'object' && payload !== null && !Buffer.isBuffer(payload)) {
              return res.json(payload);
            }
            res.end(payload);
            return res;
          };

          const handlerModule = await import(`${calHandlerUrl}?t=${Date.now()}`);
          const handler = handlerModule.default;

          if (typeof handler !== 'function') {
            throw new Error('api/cal default export is not a function');
          }

          await handler(req, res);
        } catch (error) {
          console.error('[vite local api] /api/cal failed:', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Local API handler error',
              details: error instanceof Error ? error.message : String(error),
            }));
          }
        }
      });
    },
  };
};

export default defineConfig({
  plugins: [
    react(),
    devApiPlugin(),
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
    // Note: /api routes are Vercel serverless functions.
    // In local dev, imageService.js uploads directly to Supabase (no proxy needed).
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
