import { useState } from 'react';
import { haptic } from '../lib/telegram';

export default function Onboarding({ t, lang, setLang, onDone }) {
  const [step, setStep] = useState(0);

  const slides = [
    { art: <img src="/logo.png" alt="ASF GROUP" />, plain: true, title: t.onb1Title, text: t.onb1Text },
    { art: '👟', title: t.onb2Title, text: t.onb2Text },
    { art: '📦', title: t.onb3Title, text: t.onb3Text },
  ];

  const slide = slides[step];
  const isLast = step === slides.length - 1;

  const next = () => {
    haptic();
    if (isLast) onDone();
    else setStep(step + 1);
  };

  return (
    <div className="onb">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="lang-pill"
          style={{ marginTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}
          onClick={() => setLang(lang === 'uz' ? 'ru' : 'uz')}
        >
          {lang === 'uz' ? "🇺🇿 O'zbekcha" : '🇷🇺 Русский'}
        </button>
        <button className="onb-skip" onClick={onDone}>
          {t.skip}
        </button>
      </div>

      <div className="onb-art">
        <div className={`onb-circle${slide.plain ? ' plain' : ''}`}>{slide.art}</div>
      </div>

      <h1>{slide.title}</h1>
      <p>{slide.text}</p>

      <div className="dots">
        {slides.map((_, i) => (
          <span key={i} className={`dot${i === step ? ' on' : ''}`} />
        ))}
      </div>

      <button className="btn" onClick={next}>
        {isLast ? t.start : t.next}
      </button>
    </div>
  );
}
