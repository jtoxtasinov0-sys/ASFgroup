import { useCallback, useEffect, useState } from 'react';
import { api, date } from '../lib/api';
import ImagePicker from '../components/ImagePicker';

/** Barcha mijozlarga bot orqali xabar (rassilka) */
export default function Broadcast() {
  const [info, setInfo] = useState(null);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [withButton, setWithButton] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .broadcastInfo()
      .then(setInfo)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  // Rassilka ketayotganda holatni har 2 soniyada yangilab turamiz
  useEffect(() => {
    if (!info?.running) return undefined;
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [info?.running, load]);

  const limit = files.length ? 1024 : 4096;
  const tooLong = text.trim().length > limit;
  const empty = !text.trim() && !files.length;

  const send = async (testOnly) => {
    if (empty || tooLong || busy) return;
    if (
      !testOnly &&
      !window.confirm(`Xabar ${info?.users ?? ''} ta mijozga yuboriladi. Davom etamizmi?`)
    ) {
      return;
    }
    setBusy(true);
    setError('');
    const data = new FormData();
    data.append('text', text.trim());
    data.append('withButton', withButton);
    data.append('testOnly', testOnly);
    files.forEach((file) => data.append('files', file));
    try {
      const status = await api.broadcast(data);
      setInfo((prev) => ({ ...prev, ...status }));
      if (!testOnly) {
        setText('');
        setFiles([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const running = Boolean(info?.running);
  const done = info?.sent + info?.failed + info?.blocked || 0;
  const percent = info?.total ? Math.round((done / info.total) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <h1>Rassilka</h1>
        <span className="muted">
          👥 Mijozlar: <b>{info ? info.users : '…'}</b>
        </span>
      </div>

      {error && <div className="alert">{error}</div>}

      {info?.startedAt && (
        <div className="card broadcast-status">
          <div className="broadcast-status-head">
            <b>
              {running ? '📣 Yuborilmoqda…' : '✅ Oxirgi rassilka tugadi'}
              {info.testOnly ? ' (sinov — faqat adminlarga)' : ''}
            </b>
            <span className="muted">{date(info.finishedAt || info.startedAt)}</span>
          </div>
          <div className="progress">
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="broadcast-counts">
            <span>
              ✅ Yuborildi: <b>{info.sent}</b> / {info.total}
            </span>
            <span>
              🚫 Botni bloklagan: <b>{info.blocked}</b>
            </span>
            {info.failed > 0 && (
              <span>
                ⚠️ Xato: <b>{info.failed}</b>
              </span>
            )}
          </div>
          {info.preview && <div className="muted broadcast-preview">“{info.preview}”</div>}
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <div className="field full" style={{ marginBottom: 16 }}>
          <label>Rasm (ixtiyoriy)</label>
          <ImagePicker
            existing={[]}
            files={files}
            onExisting={() => {}}
            onFiles={(list) => setFiles(list.slice(0, 1))}
            max={1}
            hint="Bitta rasm tanlang — xabar rasm bilan boradi"
          />
        </div>

        <div className="field full" style={{ marginBottom: 12 }}>
          <label>Xabar matni</label>
          <textarea
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Masalan:\n🔥 Yangi kolleksiya keldi! Optom narxlarda 10% chegirma — faqat shu hafta."}
          />
          <span className="hint" style={tooLong ? { color: '#b42318', fontWeight: 600 } : undefined}>
            {text.trim().length} / {limit} belgi
            {files.length ? ' (rasm bilan yuborilganda Telegram 1024 belgigacha ruxsat beradi)' : ''}
          </span>
        </div>

        <label className="checkline" style={{ marginBottom: 18 }}>
          <input
            type="checkbox"
            checked={withButton}
            onChange={(e) => setWithButton(e.target.checked)}
          />
          Xabar ostida "🛍 Do'konni ochish" tugmasi bo'lsin
        </label>

        <div className="broadcast-actions">
          <button
            type="button"
            className="btn btn-line"
            disabled={empty || tooLong || busy || running}
            onClick={() => send(true)}
          >
            🧪 Sinov: faqat adminlarga
          </button>
          <button
            type="button"
            className="btn"
            disabled={empty || tooLong || busy || running}
            onClick={() => send(false)}
          >
            {busy ? 'Yuborilmoqda…' : `📣 Hammaga yuborish (${info?.users ?? 0})`}
          </button>
        </div>
        <p className="hint" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
          Avval "Sinov" bilan o'zingizga yuborib ko'ring. Xabar botga kamida bir marta /start bosgan
          barcha mijozlarga boradi. Botni bloklaganlarga yetib bormaydi.
        </p>
      </div>
    </>
  );
}
