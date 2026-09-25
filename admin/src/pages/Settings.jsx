import { useEffect, useState } from 'react';
import { api } from '../lib/api';

/** 8600123412341234 -> "8600 1234 1234 1234" */
const formatCard = (v) =>
  String(v || '')
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

/** Karta raqamidan turini aniqlaydi: 9860 — Humo, 8600 / 5614 / 6262 — Uzcard */
const detectType = (v) => {
  const n = String(v || '').replace(/\D/g, '');
  if (n.startsWith('9860')) return 'humo';
  if (/^(8600|5614|6262)/.test(n)) return 'uzcard';
  return '';
};

export default function Settings() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fill = (data) => setForm({ ...data, cardNumber: formatCard(data.cardNumber) });

  useEffect(() => {
    api
      .settings()
      .then(fill)
      .catch((err) => setError(err.message));
  }, []);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onCard = (e) => {
    const cardNumber = formatCard(e.target.value);
    const detected = detectType(cardNumber);
    setForm((prev) => ({ ...prev, cardNumber, cardType: detected || prev.cardType }));
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      fill(await api.saveSettings(form));
      setMessage('✅ Saqlandi');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Sozlamalar</h1>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert ok">{message}</div>}

      {!form ? (
        !error && (
          <div className="center">
            <div className="spinner" />
          </div>
        )
      ) : (
        <form className="card settings-card" onSubmit={save}>
          <h2>🏦 Kartaga o'tkazma (Uzcard / Humo)</h2>
          <p className="muted">
            Karta kiritilsa, buyurtma berishda <b>"Kartaga o'tkazma"</b> usuli paydo bo'ladi. Mijozga
            Mini App'da va botda shu karta raqami va to'lanadigan summa ko'rsatiladi. Mijoz to'lab,
            chek rasmini yuboradi — adminlarga botdan <b>✅ Tasdiqlash / ❌ Rad etish</b> tugmalari
            bilan xabar keladi.
          </p>

          <div className="form-grid">
            <div className="field">
              <label>Karta raqami</label>
              <input
                className="mono"
                inputMode="numeric"
                placeholder="8600 0000 0000 0000"
                value={form.cardNumber}
                onChange={onCard}
              />
              <span className="hint">Bo'sh qoldirilsa, kartaga o'tkazma o'chiriladi</span>
            </div>

            <div className="field">
              <label>Karta turi</label>
              <select value={form.cardType} onChange={set('cardType')}>
                <option value="">Tanlang</option>
                <option value="uzcard">Uzcard</option>
                <option value="humo">Humo</option>
              </select>
            </div>

            <div className="field full">
              <label>Karta egasi (qabul qiluvchi)</label>
              <input
                placeholder="Masalan: ALIYEV ANVAR"
                value={form.cardHolder}
                onChange={set('cardHolder')}
              />
            </div>
          </div>

          <p className="muted" style={{ marginTop: 18 }}>
            🔔 Chek xabarlari kimga boradi: serverdagi <b>ADMIN_CHAT_IDS</b> ro'yxatidagilarga va
            botga <b>/admin PAROL</b> yozib admin bo'lganlarga.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <button className="btn" disabled={busy}>
              {busy ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
            <span className={`badge ${form.enabled ? 'on' : 'off'}`}>
              {form.enabled ? "Kartaga o'tkazma yoqilgan" : "Kartaga o'tkazma o'chirilgan"}
            </span>
          </div>
        </form>
      )}
    </>
  );
}
