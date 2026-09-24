import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Telegram ichida (botdagi "Admin panel" tugmasi) ochilganda:
// to'liq ekranga yoyiladi va pastga surganda panel yopilib qolmaydi
const tg = window.Telegram?.WebApp;
if (tg?.initData) {
  try {
    tg.ready();
    tg.expand();
    if (tg.isVersionAtLeast?.('7.7')) tg.disableVerticalSwipes();
    // Eski Telegram'da surishni o'chirib bo'lmaydi — hech bo'lmasa yopishdan oldin so'raydi
    else tg.enableClosingConfirmation?.();
    tg.setHeaderColor?.('#16243F');
  } catch (_) {
    /* eski Telegram versiyalari */
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
