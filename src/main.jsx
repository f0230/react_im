import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './index.css';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { HelmetProvider } from 'react-helmet-async';



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
          

            <SpeedInsights /> {/* ✅ insertado aquí */}
          </ErrorBoundary>
        </HelmetProvider>
        </React.StrictMode>
      );
      console.log('React app mounted successfully');
    } catch (error) {
      console.error('Error mounting React app:', error);
    }
  } else {
    console.error('Root element not found');
  }
});
