// Script de diagnóstico para depuración
console.log('Diagnostic script loaded');

window.runDiagnostics = function() {
  console.log('------- DIAGNÓSTICO -------');
  console.log('User Agent:', navigator.userAgent);
  console.log('Window dimensions:', window.innerWidth, 'x', window.innerHeight);
  console.log('Root element:', document.getElementById('root'));
  console.log('React loaded:', typeof React !== 'undefined');
  console.log('ReactDOM loaded:', typeof ReactDOM !== 'undefined');
  
  // Comprobar si hay errores en la consola
  if (console.errors && console.errors.length > 0) {
    console.log('Errores registrados:', console.errors);
  }
  
  console.log('--------------------------');
};

// Ejecutar diagnóstico después de cargar
window.addEventListener('load', function() {
  setTimeout(window.runDiagnostics, 1000);
});