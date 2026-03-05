// vite.config.js
import { defineConfig } from "file:///home/fran/Documents/DTE/DEV/react_dte/node_modules/vite/dist/node/index.js";
import react from "file:///home/fran/Documents/DTE/DEV/react_dte/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { visualizer } from "file:///home/fran/Documents/DTE/DEV/react_dte/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import Pages from "file:///home/fran/Documents/DTE/DEV/react_dte/node_modules/vite-plugin-pages/dist/index.js";
import PagesSitemap from "file:///home/fran/Documents/DTE/DEV/react_dte/node_modules/vite-plugin-pages-sitemap/dist/index.js";
import Sitemap from "file:///home/fran/Documents/DTE/DEV/react_dte/node_modules/vite-plugin-sitemap/dist/index.js";
var __vite_injected_original_dirname = "/home/fran/Documents/DTE/DEV/react_dte";
var vite_config_default = defineConfig({
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
      hostname: "https://www.grupodte.com",
      exclude: ["/404"]
    }),
    visualizer({
      filename: "./dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true
    }),
    Sitemap({
      hostname: "https://www.grupodte.com",
      routes: [
        "/",
        "/Nosotros",
        "/Contacto",
        "/servicios",
        "/despega",
        "/tyc",
        "/politica-privacidad"
      ]
    })
  ],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001"
    }
  },
  build: {
    target: "esnext",
    outDir: "dist",
    assetsDir: "assets",
    chunkSizeWarningLimit: 500,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // Code splitting agresivo para reducir bundle inicial
        manualChunks: {
          // Vendor crítico - carga primero
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Animaciones - carga diferida
          "vendor-animations": ["framer-motion", "gsap"],
          // i18n - carga diferida
          "vendor-i18n": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
          // UI libs
          "vendor-ui": ["lucide-react", "swiper"],
          // Supabase/Auth
          "vendor-backend": ["@supabase/supabase-js", "@react-oauth/google"]
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "framer-motion",
      "gsap"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9mcmFuL0RvY3VtZW50cy9EVEUvREVWL3JlYWN0X2R0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvZnJhbi9Eb2N1bWVudHMvRFRFL0RFVi9yZWFjdF9kdGUvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvZnJhbi9Eb2N1bWVudHMvRFRFL0RFVi9yZWFjdF9kdGUvdml0ZS5jb25maWcuanNcIjsvLyB2aXRlLmNvbmZpZy5qc1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJztcbi8vIGltcG9ydCB7IGltYWdldG9vbHMgfSBmcm9tICd2aXRlLWltYWdldG9vbHMnOyAvLyBDb21lbnRhZG8gdGVtcG9yYWxtZW50ZVxuLy8gaW1wb3J0IGltYWdlUHJlc2V0cyBmcm9tICd2aXRlLXBsdWdpbi1pbWFnZS1wcmVzZXRzJzsgLy8gQ29tZW50YWRvIHRlbXBvcmFsbWVudGVcbmltcG9ydCBQYWdlcyBmcm9tICd2aXRlLXBsdWdpbi1wYWdlcyc7XG5pbXBvcnQgUGFnZXNTaXRlbWFwIGZyb20gJ3ZpdGUtcGx1Z2luLXBhZ2VzLXNpdGVtYXAnO1xuaW1wb3J0IFNpdGVtYXAgZnJvbSAndml0ZS1wbHVnaW4tc2l0ZW1hcCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIC8vIGltYWdldG9vbHMoKSwgLy8gQ29tZW50YWRvIHRlbXBvcmFsbWVudGVcbiAgICAvLyBpbWFnZVByZXNldHMoeyAvLyBDb21lbnRhZG8gdGVtcG9yYWxtZW50ZVxuICAgIC8vICAgcmVzcG9uc2l2ZToge1xuICAgIC8vICAgICBmb3JtYXRzOiBbJ3dlYnAnLCAnanBlZyddLFxuICAgIC8vICAgICB3aWR0aHM6IFs0ODAsIDc2OCwgMTAyNCwgMTQ0MF0sXG4gICAgLy8gICAgIHNpemVzOiAnMTAwdncnLFxuICAgIC8vICAgfSxcbiAgICAvLyB9KSxcbiAgICBQYWdlcygpLFxuICAgIFBhZ2VzU2l0ZW1hcCh7XG4gICAgICBob3N0bmFtZTogJ2h0dHBzOi8vd3d3LmdydXBvZHRlLmNvbScsXG4gICAgICBleGNsdWRlOiBbJy80MDQnXSxcbiAgICB9KSxcbiAgICB2aXN1YWxpemVyKHtcbiAgICAgIGZpbGVuYW1lOiAnLi9kaXN0L3N0YXRzLmh0bWwnLFxuICAgICAgb3BlbjogZmFsc2UsXG4gICAgICBnemlwU2l6ZTogdHJ1ZSxcbiAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgfSksXG4gICAgU2l0ZW1hcCh7XG4gICAgICBob3N0bmFtZTogJ2h0dHBzOi8vd3d3LmdydXBvZHRlLmNvbScsXG4gICAgICByb3V0ZXM6IFtcbiAgICAgICAgJy8nLFxuICAgICAgICAnL05vc290cm9zJyxcbiAgICAgICAgJy9Db250YWN0bycsXG4gICAgICAgICcvc2VydmljaW9zJyxcbiAgICAgICAgJy9kZXNwZWdhJyxcbiAgICAgICAgJy90eWMnLFxuICAgICAgICAnL3BvbGl0aWNhLXByaXZhY2lkYWQnXG4gICAgICBdLFxuICAgIH0pLFxuICBdLFxuICBiYXNlOiAnLycsXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICB9LFxuICB9LFxuXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6ICdodHRwOi8vbG9jYWxob3N0OjMwMDEnLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBhc3NldHNEaXI6ICdhc3NldHMnLFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNTAwLFxuICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICAvLyBDb2RlIHNwbGl0dGluZyBhZ3Jlc2l2byBwYXJhIHJlZHVjaXIgYnVuZGxlIGluaWNpYWxcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgLy8gVmVuZG9yIGNyXHUwMEVEdGljbyAtIGNhcmdhIHByaW1lcm9cbiAgICAgICAgICAndmVuZG9yLXJlYWN0JzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgIC8vIEFuaW1hY2lvbmVzIC0gY2FyZ2EgZGlmZXJpZGFcbiAgICAgICAgICAndmVuZG9yLWFuaW1hdGlvbnMnOiBbJ2ZyYW1lci1tb3Rpb24nLCAnZ3NhcCddLFxuICAgICAgICAgIC8vIGkxOG4gLSBjYXJnYSBkaWZlcmlkYVxuICAgICAgICAgICd2ZW5kb3ItaTE4bic6IFsnaTE4bmV4dCcsICdyZWFjdC1pMThuZXh0JywgJ2kxOG5leHQtYnJvd3Nlci1sYW5ndWFnZWRldGVjdG9yJ10sXG4gICAgICAgICAgLy8gVUkgbGlic1xuICAgICAgICAgICd2ZW5kb3ItdWknOiBbJ2x1Y2lkZS1yZWFjdCcsICdzd2lwZXInXSxcbiAgICAgICAgICAvLyBTdXBhYmFzZS9BdXRoXG4gICAgICAgICAgJ3ZlbmRvci1iYWNrZW5kJzogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnLCAnQHJlYWN0LW9hdXRoL2dvb2dsZSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLFxuICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAnZnJhbWVyLW1vdGlvbicsXG4gICAgICAnZ3NhcCdcbiAgICBdLFxuICB9LFxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyxrQkFBa0I7QUFHM0IsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sa0JBQWtCO0FBQ3pCLE9BQU8sYUFBYTtBQVRwQixJQUFNLG1DQUFtQztBQVd6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBU04sTUFBTTtBQUFBLElBQ04sYUFBYTtBQUFBLE1BQ1gsVUFBVTtBQUFBLE1BQ1YsU0FBUyxDQUFDLE1BQU07QUFBQSxJQUNsQixDQUFDO0FBQUEsSUFDRCxXQUFXO0FBQUEsTUFDVCxVQUFVO0FBQUEsTUFDVixNQUFNO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixZQUFZO0FBQUEsSUFDZCxDQUFDO0FBQUEsSUFDRCxRQUFRO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixRQUFRO0FBQUEsUUFDTjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxNQUFNO0FBQUEsRUFDTixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFFQSxRQUFRO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsSUFDVjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLHVCQUF1QjtBQUFBLElBQ3ZCLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFVBQVU7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLGVBQWU7QUFBQSxNQUNqQjtBQUFBLElBQ0Y7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQTtBQUFBLFFBRU4sY0FBYztBQUFBO0FBQUEsVUFFWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUE7QUFBQSxVQUV6RCxxQkFBcUIsQ0FBQyxpQkFBaUIsTUFBTTtBQUFBO0FBQUEsVUFFN0MsZUFBZSxDQUFDLFdBQVcsaUJBQWlCLGtDQUFrQztBQUFBO0FBQUEsVUFFOUUsYUFBYSxDQUFDLGdCQUFnQixRQUFRO0FBQUE7QUFBQSxVQUV0QyxrQkFBa0IsQ0FBQyx5QkFBeUIscUJBQXFCO0FBQUEsUUFDbkU7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
