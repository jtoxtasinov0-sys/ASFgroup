import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
const tgInitData = tg?.initData || '';

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Botdagi tugma orqali ochilgan bo'lsa — avval Telegram orqali kirib ko'ramiz
  const [tgTrying, setTgTrying] = useState(Boolean(tgInitData));

  useEffect(() => {
    if (!tgInitData) return;
    tg.ready?.();
    tg.expand?.();
    api
      .telegramLogin(tgInitData)
      .then(onSuccess)
      .catch(() => setTgTrying(false));
    // Faqat birinchi ochilishda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tgTrying) {
    return (
      <div className="login">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="ASF GROUP" />
          <h1>ASF GROUP</h1>
          <p>Telegram orqali kirilmoqda...</p>
          <div className="spinner" style={{ margin: '16px auto 0' }} />
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      onSuccess();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <img src="/logo.png" alt="ASF GROUP" />
        <h1>ASF GROUP</h1>
        <p>SIFAT VA ISHONCH</p>

        {error && <div className="alert">{error}</div>}

        <div className="field" style={{ marginBottom: 20 }}>
          <label>Parol</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </div>

        <button className="btn btn-full" disabled={busy || !password}>
          {busy ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
