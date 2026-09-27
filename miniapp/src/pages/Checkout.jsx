import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { isPhoneValid, phoneMask } from '../lib/format';
import { haptic, notifySuccess } from '../lib/telegram';

export default function Checkout({ t, lang, config, user, cartItems, onClose, onSuccess, onFailed }) {
  const initialName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '';
  const [form, setForm] = useState({
    customerName: initialName,
    phone: phoneMask(user?.phone || ''),
    region: '',
    address: '',
    comment: '',
    // Admin karta kiritgan bo'lsa — kartaga o'tkazma birinchi tanlangan bo'ladi
    paymentMethod: config?.payment?.enabled ? 'card' : 'cash',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const regions = config?.regions || [];

  // Oldin buyurtma bergan mijozga oxirgi buyurtmasidagi ism, telefon,
  // viloyat va manzil avtomatik qo'yiladi — qaytadan yozib o'tirmaydi
  useEffect(() => {
    let alive = true;
    api
      .myOrders()
      .then((orders) => {
        const last = Array.isArray(orders) ? orders[0] : null;
        if (!alive || !last) return;
        // Viloyat boshqa tilda saqlangan bo'lishi mumkin — joriy tilga o'giramiz
        const match = regions.find((r) => r.uz === last.region || r.ru === last.region);
        const region = match ? (lang === 'ru' ? match.ru : match.uz) : '';
        setForm((prev) => ({
          ...prev,
          // Mijoz o'zi yozishga ulgurgan bo'lsa — tegmaymiz
          customerName:
            prev.customerName.trim() && prev.customerName !== initialName
              ? prev.customerName
              : last.customerName || prev.customerName,
          phone: isPhoneValid(prev.phone) ? prev.phone : phoneMask(last.phone || ''),
          region: prev.region || region,
          address: prev.address || last.address || '',
        }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // To'ldirilmagan majburiy maydonlar qizil bo'lib, "To'ldiring" deb turadi
  const errors = {
    customerName: form.customerName.trim().length < 2 && t.fillField,
    phone:
      !isPhoneValid(form.phone) &&
      (form.phone.replace(/\D/g, '').length > 3 ? t.phoneInvalid : t.fillField),
    region: !form.region && t.fillField,
    address: form.address.trim().length < 3 && t.fillField,
  };
  const valid = !Object.values(errors).some(Boolean);

  const fieldClass = (key) => `field${errors[key] ? ' invalid' : ''}`;
  const fieldError = (key) => errors[key] && <span className="field-error">{errors[key]}</span>;

  const submit = async () => {
    if (busy) return;
    if (!valid) {
      // Birinchi to'ldirilmagan maydonga olib boradi
      haptic('heavy');
      const first = document.querySelector('.sheet .field.invalid');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first?.querySelector('input, select')?.focus();
      return;
    }
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
        paymentMethod: form.paymentMethod,
      });
      notifySuccess();
      onSuccess(order);
    } catch (err) {
      haptic('heavy');
      setError(err.message);
      // Omborda yetmagan bo'lishi mumkin — qoldiqlar yangilanadi
      if (onFailed) onFailed();
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={busy ? undefined : onClose} />
      <div className="sheet">
        <div className="sheet-handle" />

        <div className="sheet-scroll">
          <h2 className="h1" style={{ marginTop: 10, marginBottom: 16 }}>
            {t.orderTitle}
          </h2>

          <div className={fieldClass('customerName')}>
            <label>{t.yourName}</label>
            <input
              value={form.customerName}
              onChange={set('customerName')}
              placeholder={t.yourName}
            />
            {fieldError('customerName')}
          </div>

          <div className={fieldClass('phone')}>
            <label>{t.yourPhone}</label>
            <input
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: phoneMask(e.target.value) }))}
              placeholder="+998 __ ___ __ __"
            />
            {fieldError('phone')}
          </div>

          <div className={fieldClass('region')}>
            <label>{t.region}</label>
            <select value={form.region} onChange={set('region')}>
              <option value="">{t.regionPick}</option>
              {regions.map((region) => (
                <option key={region.uz} value={lang === 'ru' ? region.ru : region.uz}>
                  {lang === 'ru' ? region.ru : region.uz}
                </option>
              ))}
            </select>
            {fieldError('region')}
          </div>

          <div className={fieldClass('address')}>
            <label>{t.address}</label>
            <input value={form.address} onChange={set('address')} placeholder={t.addressPh} />
            {fieldError('address')}
          </div>

          <div className="field">
            <label>{t.comment}</label>
            <textarea value={form.comment} onChange={set('comment')} placeholder={t.commentPh} />
          </div>

          <div className="field">
            <label>{t.payMethod}</label>
            <div className="pay-options">
              {[
                config?.payment?.enabled && [
                  'card',
                  '💳',
                  config.clickEnabled ? t.payCard : t.payCardClick,
                  t.payCardText(config.payment.typeLabel),
                ],
                ['cash', '💵', t.payCash, t.payCashText],
                // Click bilan shartnoma yo'q bo'lsa — Click ham shu kartaga o'tkazma,
                // alohida tugma chalkashtirmasin
                !(config?.payment?.enabled && !config?.clickEnabled) && [
                  'click',
                  null,
                  t.payClick,
                  t.payClickText,
                ],
              ].filter(Boolean).map(([key, icon, title, text]) => (
                <button
                  key={key}
                  type="button"
                  className={`pay-option${key === 'card' ? ' wide' : ''}${form.paymentMethod === key ? ' active' : ''}`}
                  onClick={() => {
                    haptic();
                    setForm((p) => ({ ...p, paymentMethod: key }));
                  }}
                  aria-pressed={form.paymentMethod === key}
                >
                  <b>{icon ? `${icon} ${title}` : <span className="click-logo">click</span>}</b>
                  <span>{text}</span>
                </button>
              ))}
            </div>
            {form.paymentMethod === 'card' && (
              <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
                {t.payCardSoon}
              </p>
            )}
            {form.paymentMethod === 'click' && (
              <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
                {config?.clickEnabled ? t.payClickSoon : t.payClickManual}
              </p>
            )}
          </div>

          <div className="notice warn" style={{ marginTop: 0 }}>
            <span>🇺🇿</span>
            <span>{t.onlyUz}</span>
          </div>

          {error && (
            <div className="notice" style={{ background: '#fdecec', color: '#b42318' }}>
              <span>⚠️</span>
              <span style={{ whiteSpace: 'pre-line' }}>{error}</span>
            </div>
          )}
        </div>

        <div className="sheet-cta">
          <button className="btn" disabled={busy} onClick={submit}>
            {busy ? t.sending : t.confirm}
          </button>
        </div>
      </div>
    </>
  );
}
