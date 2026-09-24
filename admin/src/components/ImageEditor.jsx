import { useRef, useState } from 'react';
import { frameStyle } from '../lib/frame';

const MIN_Z = 0.5;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round = (v) => Math.round(v * 100) / 100;

/**
 * Rasmning Mini Appdagi kvadrat ko'rinishini sozlash:
 * sichqoncha / barmoq bilan surish, g'ildirak yoki slayder bilan kattalashtirish.
 * z = 1 — rasm butunlay ko'rinadi; `fillZ` — kvadratni to'liq to'ldiradi.
 */
export default function ImageEditor({ src, frame, onSave, onClose }) {
  const [f, setF] = useState(frame || null);
  const [fillZ, setFillZ] = useState(null);
  const boxRef = useRef(null);
  const drag = useRef(null);

  const maxZ = Math.max(3, (fillZ || 1) * 3);
  const ready = Boolean(f);

  const setZoom = (z) => setF((prev) => prev && { ...prev, z: round(clamp(z, MIN_Z, maxZ)) });

  const onPointerDown = (e) => {
    if (!ready) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY };
  };

  const onPointerMove = (e) => {
    if (!drag.current || !boxRef.current) return;
    const size = boxRef.current.clientWidth;
    const dx = e.clientX - drag.current.px;
    const dy = e.clientY - drag.current.py;
    drag.current = { px: e.clientX, py: e.clientY };
    setF((prev) => {
      // Kattalashtirilganda markaz teskari tomonga, kichraytirilganda — shu tomonga siljiydi
      const k = prev.z - 1;
      if (Math.abs(k) < 0.02) return prev;
      return {
        ...prev,
        x: round(clamp(prev.x - (dx / (k * size)) * 100, 0, 100)),
        y: round(clamp(prev.y - (dy / (k * size)) * 100, 0, 100)),
      };
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div className="editor-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="editor">
        <div className="modal-head">
          <h2>Rasmni sozlash</h2>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="editor-body">
          <div
            ref={boxRef}
            className="editor-box"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => f && setZoom(f.z * (e.deltaY < 0 ? 1.06 : 1 / 1.06))}
          >
            <img
              src={src}
              alt=""
              draggable={false}
              style={frameStyle(f)}
              onLoad={(e) => {
                const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                const fill = w && h ? round(Math.max(w, h) / Math.min(w, h)) : 1;
                setFillZ(fill);
                // Sozlanmagan rasm hozir kvadratni to'ldirib turibdi — shundan boshlaymiz
                setF((prev) => prev || { z: fill, x: 50, y: 50 });
              }}
            />
          </div>
          <p className="hint" style={{ textAlign: 'center', margin: '8px 0 14px' }}>
            Mijoz Mini Appda aynan shu kvadratni ko'radi. Rasmni sichqoncha bilan suring,
            g'ildirak yoki pastdagi slayder bilan kattalashtiring.
          </p>

          <div className="editor-zoom">
            <button
              type="button"
              className="btn btn-line btn-sm"
              disabled={!ready}
              onClick={() => setZoom(f.z - 0.05)}
            >
              −
            </button>
            <input
              type="range"
              min={MIN_Z}
              max={maxZ}
              step="0.01"
              value={f?.z ?? 1}
              disabled={!ready}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <button
              type="button"
              className="btn btn-line btn-sm"
              disabled={!ready}
              onClick={() => setZoom(f.z + 0.05)}
            >
              +
            </button>
            <b className="mono">{Math.round((f?.z ?? 1) * 100)}%</b>
          </div>

          <div className="editor-presets">
            <button
              type="button"
              className="btn btn-line btn-sm"
              disabled={!ready}
              onClick={() => setF({ z: 1, x: 50, y: 50 })}
            >
              ⤢ To'liq ko'rinsin
            </button>
            <button
              type="button"
              className="btn btn-line btn-sm"
              disabled={!ready}
              onClick={() => setF({ z: fillZ, x: 50, y: 50 })}
            >
              ⬛ Kvadratni to'ldirsin
            </button>
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-line" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="button" className="btn" disabled={!ready} onClick={() => onSave(f)}>
            Tayyor
          </button>
        </div>
      </div>
    </div>
  );
}
