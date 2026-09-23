import { useState } from 'react';
import { api } from '../lib/api';
import { isPhoneValid, phoneMask } from '../lib/format';
import { haptic, isTelegram, notifySuccess } from '../lib/telegram';

export default function Checkout({ t, lang, config, user, cartItems, onClose, onSuccess }) {
  const [form, setForm] = useState({
    customerName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '',
    phone: phoneMask(user?.phone || ''),
    region: '',
    address: '',
    comment: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const regions = config?.regions || [];
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const valid =
    form.customerName.trim().length >= 2 &&
    isPhoneValid(form.phone) &&
    form.region &&
    form.address.trim().length >= 3;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const order = await api.createOrder({
        items: cartItems,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        region: form.region,
        address: form.address.trim(),
        comment: form.comment.trim(),
      });
      notifySuccess();
      onSuccess(order);
    } catch (err) {
      haptic('heavy');
      setError(err.message);
      setBusy(false);
    }
  };

  // Oddiy brauzerda (havola orqali) ochilganda Telegram imzosi yo'q —
  // server buyurtmani qabul qilmaydi, shuning uchun botga yo'naltiramiz
  const botLink = config?.botUsername ? `https://t.me/${config.botUsername}` : '';

  return (
    <>
      <div className="sheet-backdrop" onClick={busy ? undefined : onClose} />
      <div className="sheet">
        <div className="sheet-handle" />

        <div className="sheet-scroll">
          <h2 className="h1" style={{ marginTop: 10, marginBottom: 16 }}>
            {t.orderTitle}
          </h2>

          <div className="field">
            <label>{t.yourName}</label>
            <input
              value={form.customerName}
              onChange={set('customerName')}
              placeholder={t.yourName}
            />
          </div>

          <div className="field">
            <label>{t.yourPhone}</label>
            <input
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: phoneMask(e.target.value) }))}
              placeholder="+998 __ ___ __ __"
            />
          </div>

          <div className="field">
            <label>{t.region}</label>
            <select value={form.region} onChange={set('region')}>
              <option value="">{t.regionPick}</option>
              {regions.map((region) => (
                <option key={region.uz} value={lang === 'ru' ? region.ru : region.uz}>
                  {lang === 'ru' ? region.ru : region.uz}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>{t.address}</label>
            <input value={form.address} onChange={set('address')} placeholder={t.addressPh} />
          </div>

          <div className="field">
            <label>{t.comment}</label>
            <textarea value={form.comment} onChange={set('comment')} placeholder={t.commentPh} />
          </div>

          <div className="notice warn" style={{ marginTop: 0 }}>
            <span>🇺🇿</span>
            <span>{t.onlyUz}</span>
          </div>

          {!isTelegram && (
            <div className="notice" style={{ background: '#fdecec', color: '#b42318' }}>
              <span>⚠️</span>
              <span>
                {t.openInBot}
                {botLink && (
                  <>
                    {' '}
                    <a href={botLink} style={{ fontWeight: 700, color: 'inherit' }}>
                      @{config.botUsername}
                    </a>
                  </>
                )}
              </span>
            </div>
          )}

          {error && (
            <div className="notice" style={{ background: '#fdecec', color: '#b42318' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="sheet-cta">
          <button className="btn" disabled={!valid || busy || !isTelegram} onClick={submit}>
            {busy ? t.sending : t.confirm}
          </button>
        </div>
      </div>
    </>
  );
}
