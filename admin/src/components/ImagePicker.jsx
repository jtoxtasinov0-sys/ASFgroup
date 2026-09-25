import { useRef, useState } from 'react';
import { imageUrl } from '../lib/api';
import { frameStyle } from '../lib/frame';
import { COLORS, colorOf, customColor } from '../lib/colors';

// Har bir fayl uchun bitta vaqtinchalik manzil (har renderda yangisi yaratilmasin)
const objectUrls = new WeakMap();
export const fileSrc = (file) => {
  if (!objectUrls.has(file)) objectUrls.set(file, URL.createObjectURL(file));
  return objectUrls.get(file);
};

/**
 * Galereyadan rasm tanlash.
 * `existing` — bazadagi rasm manzillari, `files` — yangi tanlangan fayllar.
 */
export default function ImagePicker({
  existing,
  files,
  onExisting,
  onFiles,
  max = 8,
  hint,
  frames,
  onEdit,
  colors,
  onColor,
}) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const total = existing.length + files.length;
  // Qo'lda rang kiritish oynasi: { key, name, hex }
  const [custom, setCustom] = useState(null);

  // Shu mahsulotda allaqachon qo'lda kiritilgan ranglar — ro'yxatda qayta tanlash uchun
  const customOptions = [...new Set([...(colors?.values() || [])])]
    .map(colorOf)
    .filter((c) => c?.custom);

  const pickColor = (key, value) => {
    if (value === '__custom') {
      const current = colorOf(colors?.get(key));
      setCustom({
        key,
        name: current?.custom ? current.label : '',
        hex: current?.custom ? current.hex : '#c62828',
      });
      return;
    }
    onColor(key, value);
  };

  /** Bitta rasm: ko'rinishni sozlash (✎), o'chirish (×) va rang tanlash */
  const renderTile = (key, src, onRemove, index) => {
    const color = colors?.get(key) || '';
    const dot = colorOf(color);
    return (
      <div className="preview-wrap" key={typeof key === 'string' ? key : `${key.name}-${index}`}>
        <div className="preview">
          <img src={src} alt="" style={frames ? frameStyle(frames.get(key)) : undefined} />
          {onEdit && (
            <button
              type="button"
              className="preview-edit"
              onClick={() => onEdit(key, src)}
              title="Kattalik va joylashuvni sozlash"
            >
              ✎
            </button>
          )}
          <button type="button" onClick={onRemove} title="O'chirish">
            ×
          </button>
        </div>
        {onColor && (
          <label className="preview-color">
            <i style={{ background: dot ? dot.hex : 'transparent' }} className={dot ? '' : 'none'} />
            <select value={color} onChange={(e) => pickColor(key, e.target.value)}>
              <option value="">Rang —</option>
              {COLORS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
              {customOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
              <option value="__custom">✏️ Boshqa rang...</option>
            </select>
          </label>
        )}
      </div>
    );
  };

  const addFiles = (list) => {
    const picked = Array.from(list || []).filter((f) => f.type.startsWith('image/'));
    if (!picked.length) return;
    onFiles([...files, ...picked].slice(0, Math.max(0, max - existing.length)));
  };

  return (
    <div>
      <div
        className={`dropzone${drag ? ' drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <b>🖼 Galereyadan rasm tanlash</b>
        <span>{hint || `Bosing yoki rasmni shu yerga tashlang · ${total}/${max}`}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={max > 1}
          style={{ display: 'none' }}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {(existing.length > 0 || files.length > 0) && (
        <div className="previews">
          {existing.map((url) =>
            renderTile(url, imageUrl(url), () => onExisting(existing.filter((u) => u !== url)))
          )}
          {files.map((file, index) =>
            renderTile(file, fileSrc(file), () => onFiles(files.filter((_, i) => i !== index)), index)
          )}
        </div>
      )}

      {custom && (
        <div
          className="editor-back"
          onClick={(e) => e.target === e.currentTarget && setCustom(null)}
        >
          <div className="editor" style={{ maxWidth: 360 }}>
            <div className="modal-head">
              <h2>Rangni qo'lda kiritish</h2>
              <button type="button" onClick={() => setCustom(null)}>
                ×
              </button>
            </div>
            <div className="editor-body">
              <div className="field">
                <label>Rang nomi</label>
                <input
                  autoFocus
                  maxLength={30}
                  value={custom.name}
                  onChange={(e) => setCustom((p) => ({ ...p, name: e.target.value.replace(/#/g, '') }))}
                  // Enter mahsulot formasini yuborib yubormasin
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  placeholder="masalan: Qizil, Oq, Bej"
                />
              </div>
              <div className="field">
                <label>Tugmadagi rang</label>
                <div className="custom-color-row">
                  <input
                    type="color"
                    value={custom.hex}
                    onChange={(e) => setCustom((p) => ({ ...p, hex: e.target.value }))}
                  />
                  <span className="color-preview">
                    <i style={{ background: custom.hex }} />
                    {custom.name.trim() || 'Rang nomi'}
                  </span>
                </div>
                <span className="hint">Mijoz Mini Appda aynan shunday tugmani ko'radi</span>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-line" onClick={() => setCustom(null)}>
                Bekor qilish
              </button>
              <button
                type="button"
                className="btn"
                disabled={!custom.name.trim()}
                onClick={() => {
                  onColor(custom.key, customColor(custom.name, custom.hex));
                  setCustom(null);
                }}
              >
                Tayyor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
