
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

function mountApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) return false;
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  return true;
}

if (!mountApp()) {
  // If the script runs before the DOM is ready, wait for DOMContentLoaded then mount.
  window.addEventListener('DOMContentLoaded', () => {
    mountApp();
  });
}
