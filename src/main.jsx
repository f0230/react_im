import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './index.css';

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');
  
  // Asegurarnos de que el elemento root existe
  if (rootElement) {
    // Eliminar el fallback
    const fallback = document.getElementById('fallback');
    if (fallback) {
      fallback.style.display = 'none';
    }
    
    try {
      const root = createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
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