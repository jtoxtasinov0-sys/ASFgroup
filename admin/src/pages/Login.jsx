import { useState } from 'react';
import { api } from '../lib/api';

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
