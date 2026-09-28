import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// "O'rnatish" hodisasi React'dan oldin kelishi mumkin — erta ulab qo'yamiz
import './lib/install';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
