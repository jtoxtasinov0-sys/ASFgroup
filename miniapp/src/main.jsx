import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { installRecovery, registerServiceWorker } from './lib/recover';
// "O'rnatish" hodisasi React'dan oldin kelishi mumkin — erta ulab qo'yamiz
import './lib/install';
import './styles/index.css';

// Fondan qaytganda oq ekran bo'lib qolmasligi uchun
installRecovery();
// Keyingi ochilishlar internetni kutmasdan, telefon xotirasidan bo'ladi
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
