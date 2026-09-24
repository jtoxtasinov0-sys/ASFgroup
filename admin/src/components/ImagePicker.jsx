import { useRef, useState } from 'react';
import { imageUrl } from '../lib/api';
import { frameStyle } from '../lib/frame';

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
}) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const total = existing.length + files.length;

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
          {existing.map((url) => (
            <div className="preview" key={url}>
              <img src={imageUrl(url)} alt="" style={frames ? frameStyle(frames.get(url)) : undefined} />
              {onEdit && (
                <button
                  type="button"
                  className="preview-edit"
                  onClick={() => onEdit(url, imageUrl(url))}
                  title="Kattalik va joylashuvni sozlash"
                >
                  ✎
                </button>
              )}
              <button
                type="button"
                onClick={() => onExisting(existing.filter((u) => u !== url))}
                title="O'chirish"
              >
                ×
              </button>
            </div>
          ))}

          {files.map((file, index) => (
            <div className="preview" key={`${file.name}-${index}`}>
              <img
                src={fileSrc(file)}
                alt=""
                style={frames ? frameStyle(frames.get(file)) : undefined}
              />
              {onEdit && (
                <button
                  type="button"
                  className="preview-edit"
                  onClick={() => onEdit(file, fileSrc(file))}
                  title="Kattalik va joylashuvni sozlash"
                >
                  ✎
                </button>
              )}
              <button
                type="button"
                onClick={() => onFiles(files.filter((_, i) => i !== index))}
                title="O'chirish"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
