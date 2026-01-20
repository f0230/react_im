import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './index.css';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { HelmetProvider } from 'react-helmet-async';
import './i18n';



document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');

  const preventZoom = (event) => {
    if (event.type.startsWith('gesture')) {
      event.preventDefault();
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      const blockedKeys = ['+', '-', '=', '0'];
      if (event.type === 'wheel' || blockedKeys.includes(event.key)) {
        event.preventDefault();
      }
    }
  };

  document.addEventListener('wheel', preventZoom, { passive: false });
  document.addEventListener('keydown', preventZoom);
  document.addEventListener('gesturestart', preventZoom);
  document.addEventListener('gesturechange', preventZoom);
  document.addEventListener('gestureend', preventZoom);

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
