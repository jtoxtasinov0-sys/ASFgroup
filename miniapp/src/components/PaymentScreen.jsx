import { useEffect, useRef, useState } from 'react';
import { api, imageUrl } from '../lib/api';
import { money } from '../lib/format';
import { compressImage } from '../lib/image';
import { haptic, notifySuccess } from '../lib/telegram';

/** Matnni buferga nusxalaydi (Telegram WebView'da clipboard API bo'lmasa ham ishlaydi) */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}

function CopyButton({ value, t }) {
  const [done, setDone] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={`pay-copy${done ? ' done' : ''}`}
      onClick={async () => {
        if (await copyText(value)) {
          haptic();
          setDone(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setDone(false), 1600);
        }
      }}
    >
      {done ? t.copied : t.copy}
    </button>
  );
}

/**
 * To'lov ekrani: karta raqami, summa va chek rasmini yuklash.
 * fresh — buyurtma hozirgina berilgan bo'lsa (yashil belgi ko'rsatiladi)
 */
export default function PaymentScreen({ t, order, payment, company, fresh, onClose, onUploaded }) {
  const [status, setStatus] = useState(order.paymentStatus === 'pending' ? 'done' : 'idle');
  const [preview, setPreview] = useState(order.receiptUrl ? imageUrl(order.receiptUrl) : '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const pickFile = () => {
    if (status === 'uploading') return;
    inputRef.current?.click();
  };

  const onFile = async (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;

    setError('');
    setStatus('uploading');
    const previous = preview;
    const file = await compressImage(picked);
    setPreview(URL.createObjectURL(file));

    try {
      const result = await api.uploadReceipt(order.id, file);
      notifySuccess();
      setStatus('done');
      onUploaded?.({ ...order, ...result });
    } catch (err) {
      haptic('heavy');
      setError(err.message);
      setPreview(previous);
      setStatus('idle');
    }
  };

  const phone = (company?.phone || '').replace(/\s/g, '');

  return (
    <div className="pay-screen">
      <div className="pay-scroll">
        {fresh && <div className="check pay-check">✓</div>}
        <h1 className="h1" style={{ textAlign: 'center' }}>
          {fresh ? t.successTitle : t.payTitle}
        </h1>
        <p className="pay-sub">
          {t.orderNo}: <b>#{order.id}</b>
        </p>
        <p className="pay-sub">{t.payHint}</p>

        <div className="pay-card">
          <div className="pay-row">
            <span>{t.cardType}</span>
            <b>{payment.typeLabel}</b>
          </div>
          <div className="pay-row">
            <span>{t.cardNumber}</span>
            <div className="pay-val">
              <b className="mono">{payment.cardFormatted}</b>
              <CopyButton value={payment.cardNumber} t={t} />
            </div>
          </div>
          <div className="pay-row">
            <span>{t.cardHolder}</span>
            <b>{payment.cardHolder}</b>
          </div>
          <div className="pay-divider" />
          <div className="pay-row">
            <span>{t.amount}</span>
            <div className="pay-val">
              <b className="pay-amount">
                {money(order.total)} {t.sum}
              </b>
              <CopyButton value={String(order.total)} t={t} />
            </div>
          </div>
        </div>

        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />

        <button
          type="button"
          className={`pay-upload${preview ? ' has' : ''}`}
          onClick={pickFile}
          disabled={status === 'uploading'}
        >
          {preview ? (
            <>
              <img src={preview} alt="" />
              <span>{status === 'uploading' ? t.uploading : t.changeReceipt}</span>
            </>
          ) : (
            <span>{status === 'uploading' ? t.uploading : t.uploadReceipt}</span>
          )}
        </button>

        {status === 'done' && (
          <div className="notice ok">
            <span>✅</span>
            <span>{t.receiptSent}</span>
          </div>
        )}

        {error && (
          <div className="notice" style={{ background: '#fdecec', color: '#b42318' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {status !== 'done' && (
          <p className="muted" style={{ textAlign: 'center', fontSize: 12.5, marginTop: 12 }}>
            {t.payLaterHint}
          </p>
        )}

        {phone && (
          <a className="pay-help" href={`tel:${phone}`}>
            {t.questions}
          </a>
        )}
      </div>

      <div className="sheet-cta">
        <button
          className={`btn${status === 'done' ? '' : ' btn-ghost'}`}
          onClick={onClose}
          disabled={status === 'uploading'}
        >
          {status === 'done' ? t.done : t.payLater}
        </button>
      </div>
    </div>
  );
}
