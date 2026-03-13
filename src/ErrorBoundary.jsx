// src/ErrorBoundary.jsx
import React from 'react';

const CHUNK_ERROR_RELOAD_KEY = 'chunk_error_reloaded_at';
const RELOAD_COOLDOWN_MS = 10_000; // no recargar más de una vez cada 10 segundos

function isChunkLoadError(error) {
  if (!error) return false;
  const msg = error.message || error.toString();
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS') ||
    (error instanceof TypeError && msg.includes('import'))
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("ErrorBoundary caught an error", error, info);

    if (isChunkLoadError(error)) {
      const lastReload = Number(sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY) || 0);
      const now = Date.now();
      if (now - lastReload > RELOAD_COOLDOWN_MS) {
        sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, String(now));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunk = isChunkLoadError(this.state.error);

      if (isChunk) {
        // Mostrar un mensaje amigable mientras se recarga (o si el reload falló)
        return (
          <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', background: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '18px', marginBottom: '16px', color: '#333' }}>
              Hay una nueva versión disponible. Recargando...
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
            >
              Recargar Página
            </button>
          </div>
        );
      }

      return (
        <div style={{ padding: '20px', color: 'red', position: 'relative', zIndex: 9999, background: 'white' }}>
          <h1>¡Algo salió mal!</h1>
          <p><strong>Error:</strong> {this.state.error?.toString()}</p>
          {this.state.info && (
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px', fontSize: '12px' }}>
              <summary>Stack Trace (Internal Info)</summary>
              {this.state.info.componentStack}
            </details>
          )}
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px', cursor: 'pointer' }}>
            Recargar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;