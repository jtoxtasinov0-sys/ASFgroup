import { useEffect, useRef, useState } from 'react';
import { coverSize, frameStyle } from '../lib/frame';

const MAX_Z = 4;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round = (v) => Math.round(v * 1000) / 1000;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Rasmning Mini Appdagi ko'rinishini sozlash (tik 3:4 ramka).
 * Rasm doim ramkani to'liq to'ldiradi — yon tomonlarda bo'sh joy qolmaydi.
 * Barmoq / sichqoncha bilan surish, ikki barmoq, g'ildirak yoki slayder bilan kattalashtirish.
 */
export default function ImageEditor({ src, frame, onSave, onClose }) {
  // Eski formatdagi sozlama (r yo'q) hisobga olinmaydi — rasm yuklangach yangidan boshlanadi
  const [f, setF] = useState(frame?.r ? frame : null);
  const boxRef = useRef(null);
  const drag = useRef(null);
  const ready = Boolean(f);

  const setZoom = (z) => setF((prev) => prev && { ...prev, z: round(clamp(z, 1, MAX_Z)) });

  // Barmoqlar: bitta — surish, ikkita — yaqinlashtirish / uzoqlashtirish
  const pointers = useRef(new Map());
  const pinch = useRef(null);

  const onPointerDown = (e) => {
    if (!ready) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      pinch.current = { d: dist(pts[0], pts[1]) || 1, z: f.z };
      drag.current = null;
    } else if (pts.length === 1) {
      drag.current = { px: e.clientX, py: e.clientY };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId) || !boxRef.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current) {
      const pts = [...pointers.current.values()];
      if (pts.length >= 2) setZoom((pinch.current.z * dist(pts[0], pts[1])) / pinch.current.d);
      return;
    }
    if (!drag.current) return;

    const { clientWidth: bw, clientHeight: bh } = boxRef.current;
    const dx = e.clientX - drag.current.px;
    const dy = e.clientY - drag.current.py;
    drag.current = { px: e.clientX, py: e.clientY };

    setF((prev) => {
      const { w, h } = coverSize(prev.r, bw / bh);
      // Ramkadan tashqarida qolgan qism (px) — faqat shu doirada surish mumkin
      const overW = ((w * prev.z - 100) / 100) * bw;
      const overH = ((h * prev.z - 100) / 100) * bh;
      return {
        ...prev,
        x: overW > 1 ? round(clamp(prev.x - (dx / overW) * 100, 0, 100)) : 50,
        y: overH > 1 ? round(clamp(prev.y - (dy / overH) * 100, 0, 100)) : 50,
      };
    });
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    const [rest] = [...pointers.current.values()];
    // Bitta barmoq qolsa — surishni shu barmoq bilan davom ettiramiz
    drag.current = rest ? { px: rest.x, py: rest.y } : null;
  };

  // Sichqoncha g'ildiragi va noutbuk sensorli panelidagi "chimdish".
  // React'ning onWheel'i sahifa kattalashishini to'xtata olmaydi, shuning uchun bu yerda.
  const zoomRef = useRef(setZoom);
  zoomRef.current = setZoom;
  const zRef = useRef(1);
  zRef.current = f?.z ?? 1;
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const step = e.ctrlKey ? Math.exp(-e.deltaY / 100) : e.deltaY < 0 ? 1.06 : 1 / 1.06;
      zoomRef.current(zRef.current * step);
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, []);

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
          >
            <img
              src={src}
              alt=""
              draggable={false}
              style={frameStyle(f)}
              onLoad={(e) => {
                const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                const r = w && h ? round(w / h) : 0.75;
                setF((prev) => (prev?.r ? prev : { r, z: 1, x: 50, y: 50 }));
              }}
            />
          </div>
          <p className="hint" style={{ textAlign: 'center', margin: '8px 0 14px' }}>
            Mijoz Mini Appda aynan shu ramkani ko'radi. Rasmni barmoq yoki sichqoncha bilan
            suring. Yaqinlashtirish — ikki barmoqni yoyib, sichqoncha g'ildiragi yoki slayder
            bilan. Rasmning hammasi mijoz rasmga bosganda to'liq ochiladi.
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
              min={1}
              max={MAX_Z}
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
              onClick={() => setF((prev) => ({ ...prev, z: 1, x: 50, y: 50 }))}
            >
              ↺ Asl holatga
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
