import { useRef, useState } from 'react';
import { imageUrl } from '../lib/api';
import { frameStyle } from '../lib/frame';
import { COLORS, colorOf } from '../lib/colors';

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
            <select value={color} onChange={(e) => onColor(key, e.target.value)}>
              <option value="">Rang —</option>
              {COLORS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
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
    </div>
  );
}
