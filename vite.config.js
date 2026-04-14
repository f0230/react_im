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
  const calHandlerUrl        = pathToFileURL(path.resolve(__dirname, './api/cal/index.js')).href;
  const whatsappHandlerUrl   = pathToFileURL(path.resolve(__dirname, './api/whatsapp.js')).href;
  const studioHandlerUrl     = pathToFileURL(path.resolve(__dirname, './api/studio.js')).href;
  const copywriterHandlerUrl = pathToFileURL(path.resolve(__dirname, './api/post-copywriter.js')).href;

  const apiRoutes = [
    {
      name: '/api/cal',
      matches: (pathname) => pathname === '/api/cal' || pathname.startsWith('/api/cal/'),
      resolveQuery: (pathname, searchParams) => {
        const query = Object.fromEntries(searchParams.entries());
        const actionFromPath = pathname.startsWith('/api/cal/')
          ? pathname.slice('/api/cal/'.length)
          : null;
        if (actionFromPath && !query.action) {
          query.action = actionFromPath;
        }
        return query;
      },
      handlerUrl: calHandlerUrl,
    },
    {
      name: '/api/whatsapp',
      matches: (pathname) => [
        '/api/whatsapp',
        '/api/whatsapp-send',
        '/api/whatsapp-webhook',
        '/api/whatsapp-ai-toggle',
      ].includes(pathname),
      resolveQuery: (pathname, searchParams) => {
        const query = Object.fromEntries(searchParams.entries());
        if (!query.action) {
          if (pathname === '/api/whatsapp-send') query.action = 'send';
          if (pathname === '/api/whatsapp-webhook') query.action = 'webhook';
          if (pathname === '/api/whatsapp-ai-toggle') query.action = 'ai-toggle';
        }
        return query;
      },
      handlerUrl: whatsappHandlerUrl,
    },
    {
      name: '/api/post-copywriter',
      matches: (pathname) => pathname === '/api/post-copywriter' || pathname === '/api/generate-brand-docs',
      resolveQuery: (pathname, searchParams) => {
        const query = Object.fromEntries(searchParams.entries());
        if (!query.action && pathname === '/api/generate-brand-docs') query.action = 'generate-brand-docs';
        return query;
      },
      handlerUrl: copywriterHandlerUrl,
    },
    {
      name: '/api/studio',
      matches: (pathname) => [
        '/api/studio',
        '/api/studio-proxy',
        '/api/kie-upload',
      ].includes(pathname),
      resolveQuery: (pathname, searchParams) => {
        const query = Object.fromEntries(searchParams.entries());
        if (!query.action) {
          if (pathname === '/api/studio-proxy') query.action = 'proxy';
          if (pathname === '/api/kie-upload')   query.action = 'kie-upload';
        }
        return query;
      },
      handlerUrl: studioHandlerUrl,
    },
  ];

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
    name: 'local-api-handler',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;
        const route = apiRoutes.find((candidate) => candidate.matches(pathname));
        if (!route) {
          next();
          return;
        }

        try {
          req.query = route.resolveQuery(pathname, url.searchParams);
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

          const handlerModule = await import(`${route.handlerUrl}?t=${Date.now()}`);
          const handler = handlerModule.default;

          if (typeof handler !== 'function') {
            throw new Error(`${route.name} default export is not a function`);
          }

          await handler(req, res);
        } catch (error) {
          console.error(`[vite local api] ${pathname} failed:`, error);
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
      '@banana-studio': path.resolve(__dirname, './banana-image-studio/src'),
      '@studio-dte': path.resolve(__dirname, './studio-dte./src'),
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
