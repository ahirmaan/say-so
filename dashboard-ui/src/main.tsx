import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

function mount() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// UI-preview-only fallback: inside the real Electron app, preload-dashboard.js
// has already set window.dashboard before this module runs.
if (!window.dashboard) {
  import('./lib/mockDashboard').then(({ mockDashboard }) => {
    window.dashboard = mockDashboard;
    mount();
  });
} else {
  mount();
}
