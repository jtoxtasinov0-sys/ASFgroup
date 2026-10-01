import { useEffect, useState } from 'react';

import {
  canPromptInstall,
  dismissHint,
  isAndroid,
  isHintDismissed,
  isIos,
  isIosSafari,
  isStandalone,
  onInstallAvailable,
  promptInstall,
} from '../lib/install';
import Icon from './Icon';

const isTelegram = Boolean(typeof window !== 'undefined' && window.Telegram?.WebApp?.initData);

const IOS_STEPS = [
  'Safari pastidagi «Поделиться» (kvadrat va strelka ↑) tugmasini bosing',
  'Ro\'yxatdan «На экран «Домой»» ni tanlang',
  'O\'ng tepadagi «Добавить» ni bosing',
];

const ANDROID_STEPS = [
  'Chrome o\'ng tepasidagi ⋮ (uch nuqta) ni bosing',
  '«Добавить на главный экран» yoki «Установить приложение» ni tanlang',
  '«Добавить» / «Установить» ni bosing',
];

/** Ekranga qo'shish mumkinmi: Telegram ichida va allaqachon o'rnatilgan bo'lsa — yo'q */
export function useInstall() {
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  useEffect(() => onInstallAvailable(setCanPrompt), []);
  const available = !isTelegram && !isStandalone() && (canPrompt || isIos || isAndroid);
  return { available, canPrompt };
}

/**
 * Admin panelni telefon (yoki kompyuter) ekraniga ilova qilib qo'shish bo'yicha kartochka.
 * `forced` — yon menyudagi "Ekranga qo'shish" bosilganda, yopilgan bo'lsa ham qayta chiqadi.
 */
export default function InstallHint({ forced, onClose }) {
  const { available, canPrompt } = useInstall();
  const [closed, setClosed] = useState(isHintDismissed);

  if (!available || (closed && !forced)) return null;

  const close = () => {
    dismissHint();
    setClosed(true);
    onClose?.();
  };

  const install = async () => {
    if (await promptInstall()) close();
  };

  let body;
  if (canPrompt) {
    body = (
      <button type="button" className="btn install-btn" onClick={install}>
        <Icon name="download" size={17} stroke={2.2} /> Ekranga qo'shish
      </button>
    );
  } else if (isIos && !isIosSafari) {
    body = <p className="install-note">iPhone'da ekranga faqat Safari orqali qo'shiladi — havolani Safari'da oching</p>;
  } else {
    body = (
      <>
        <ol className="install-steps">
          {(isIos ? IOS_STEPS : ANDROID_STEPS).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {isIos && (
          <p className="install-note">⚠️ «Добавить в закладки» emas — u faqat xatcho'p, ekranga chiqmaydi</p>
        )}
      </>
    );
  }

  return (
    <div className="install-hint">
      <button type="button" className="install-x" aria-label="Yopish" onClick={close}>
        ×
      </button>
      <div className="install-head">
        <img src="/apple-touch-icon.png" alt="" className="install-icon" />
        <div>
          <b>Admin panelni ekranga qo'shing</b>
          <span>Buyurtmalarni bir bosishda, ilova kabi oching</span>
        </div>
      </div>
      {body}
    </div>
  );
}
