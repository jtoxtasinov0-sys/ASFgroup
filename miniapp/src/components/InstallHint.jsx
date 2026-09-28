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
import { haptic, isTelegram } from '../lib/telegram';

/**
 * Brauzerda (Safari, Chrome) ochilganda — ilovani telefon ekraniga qo'shish
 * bo'yicha ko'rsatma. Telegram ichida va ekrandagi belgidan ochilganda chiqmaydi.
 */
export default function InstallHint({ t }) {
  const [hidden, setHidden] = useState(() => isTelegram || isStandalone() || isHintDismissed());
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);

  useEffect(() => onInstallAvailable(setCanPrompt), []);

  if (hidden) return null;
  // Kompyuterda (brauzer o'rnatishni taklif qilmasa) ko'rsatma kerak emas
  if (!isIos && !isAndroid && !canPrompt) return null;

  const close = () => {
    dismissHint();
    setHidden(true);
  };

  const install = async () => {
    haptic();
    if (await promptInstall()) close();
  };

  let body;
  if (canPrompt) {
    body = (
      <button type="button" className="btn btn-sm install-btn" onClick={install}>
        {t.installBtn}
      </button>
    );
  } else if (isIos && !isIosSafari) {
    body = <p className="install-note">{t.installSafari}</p>;
  } else {
    const steps = isIos ? t.installIos : t.installAndroid;
    body = (
      <>
        <ol className="install-steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {isIos && <p className="install-note">⚠️ {t.installIosNote}</p>}
      </>
    );
  }

  return (
    <div className="install-hint">
      <button type="button" className="install-x" aria-label={t.installClose} onClick={close}>
        ×
      </button>
      <div className="install-head">
        <img src="/apple-touch-icon.png" alt="" className="install-icon" />
        <b>{t.installTitle}</b>
      </div>
      {body}
    </div>
  );
}
