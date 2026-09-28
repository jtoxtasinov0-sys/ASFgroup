import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { haptic, isTelegram, notifySuccess, openLink } from '../lib/telegram';

const POLL_MS = 3000;

/**
 * Click orqali to'lov oynasi: "Click bilan to'lash" (ilova / QR) va
 * "Karta bilan to'lash" (Uzcard / Humo karta raqami + SMS).
 * To'lov holati har 3 soniyada so'raladi — Click tasdiqlashi bilan natija ochiladi.
 */
export default function ClickPayScreen({ t, order, auto, onClose, onPaid }) {
  const [paid, setPaid] = useState(order.paymentStatus === 'paid');
  const [opened, setOpened] = useState(false);
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (busy.current || paid) return;
    busy.current = true;
    try {
      const s = await api.orderStatus(order.id);
      if (s.paymentStatus === 'paid') {
        setPaid(true);
        notifySuccess();
        onPaid?.({ ...order, ...s });
      }
    } catch (_) {
      /* tarmoq uzilgan bo'lsa — keyingi safar */
    } finally {
      busy.current = false;
    }
  }, [order, paid, onPaid]);

  useEffect(() => {
    if (paid) return undefined;
    const timer = setInterval(check, POLL_MS);
    // Mijoz Click'dan qaytib kelishi bilan darhol tekshiramiz
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [paid, check]);

  const go = (url) => {
    haptic();
    setOpened(true);
    openLink(url);
  };

  if (paid) {
    return (
      <div className="pay-screen cpay">
        <div className="pay-scroll cpay-done">
          <div className="check pay-check cpay-pop">✓</div>
          <h1 className="h1">{t.clickPaidTitle}</h1>
          <p className="pay-sub">{t.clickPaidText(order.id)}</p>
          <div className="cpay-sum">
            <small>{t.clickSum}</small>
            <b>{money(order.total)} {t.sum}</b>
          </div>
        </div>
        <div className="sheet-cta">
          <button className="btn" onClick={onClose}>
            {isTelegram ? t.done : t.toHome}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pay-screen cpay">
      <div className="pay-scroll">
        <div className="cpay-icon" aria-hidden="true">
          <i />
        </div>
        <h1 className="h1 cpay-title">{t.clickFinish}</h1>

        <div className="cpay-sum">
          <small>{t.clickSum}</small>
          <b>{money(order.total)} {t.sum}</b>
        </div>

        <div className="cpay-tag">
          <span>✓</span>
          {t.orderNo} <b>#{order.id}</b>
        </div>

        <div className="cpay-box">
          <button type="button" className="cpay-btn cp-click" onClick={() => go(order.payUrls.app)}>
            <span className="cpay-ring" />
            {t.clickPayApp}
          </button>
          <p>{t.clickPayAppHint}</p>
          <p className="cpay-fast">⚡ {auto ? t.clickInstant : t.clickManual}</p>
        </div>

        <div className="cpay-box green">
          <button type="button" className="cpay-btn cp-card" onClick={() => go(order.payUrls.card)}>
            <span className="cpay-card" />
            {t.clickPayCard}
          </button>
          <p>🔒 {t.clickCardHint}</p>
          <p className="cpay-fast">⚡ {auto ? t.clickInstant : t.clickManual}</p>
        </div>

        {opened && (
          <p className="cpay-wait">
            <span className="cpay-sand">⏳</span> {t.clickWaiting}
          </p>
        )}
        <p className="cpay-code">
          {t.clickCode}: <b>ASF-{order.id}</b>
        </p>
      </div>

      <div className="sheet-cta">
        <button className="btn btn-ghost" onClick={onClose}>
          {t.payLater}
        </button>
      </div>
    </div>
  );
}
