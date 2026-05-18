import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './index.css';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { HelmetProvider } from 'react-helmet-async';
import './i18n';

const lockViewportZoom = () => {
  const preventGesture = (event) => {
    event.preventDefault();
  };

  const preventMultiTouch = (event) => {
    if (event.touches?.length > 1) {
      event.preventDefault();
    }
  };

  document.addEventListener('gesturestart', preventGesture, { passive: false });
  document.addEventListener('gesturechange', preventGesture, { passive: false });
  document.addEventListener('gestureend', preventGesture, { passive: false });
  document.addEventListener('touchmove', preventMultiTouch, { passive: false });
};

lockViewportZoom();

// ─── SERVICE WORKER ────────────────────────────────────────────
// Only register in production. In dev, the Vite HMR server handles caching.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update();

        registration.addEventListener('updatefound', () => {
          const next = registration.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW is waiting — tell the app so it can show the update banner.
              window.dispatchEvent(new CustomEvent('sw:update-available', { detail: registration }));
            }
          });
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));

    // When a new SW takes control, reload once to get fresh assets.
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloading) {
        reloading = true;
        window.location.reload();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');

  if (rootElement) {
    const fallback = document.getElementById('fallback');
    if (fallback) {
      fallback.style.display = 'none';
    }

    try {
      const root = createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <HelmetProvider>
            <ErrorBoundary>


              <App />


              {typeof SpeedInsights === 'function' && <SpeedInsights />} {/* ✅ insertado aquí con chequeo */}
            </ErrorBoundary>
          </HelmetProvider>
        </React.StrictMode>
      );

    } catch (error) {
      console.error('Error mounting React app:', error);
    }
  } else {
    console.error('Root element not found');
  }
});
