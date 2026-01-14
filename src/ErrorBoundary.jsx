// src/ErrorBoundary.jsx
import React from 'react';

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
  }

  render() {
    if (this.state.hasError) {
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