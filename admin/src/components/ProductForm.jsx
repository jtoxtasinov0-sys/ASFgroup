import { useState } from 'react';
import { api } from '../lib/api';
import ImagePicker from './ImagePicker';

const ALL_SIZES = [39, 40, 41, 42, 43];

const TAGS = [
  { key: '', label: '— tegsiz —' },
  { key: 'klassik', label: 'Klassik' },
  { key: 'mokasin', label: 'Mokasin' },
  { key: 'loafer', label: 'Loafer' },
  { key: 'slipon', label: 'Slip-on' },
  { key: 'sport', label: 'Sport' },
  { key: 'yozgi', label: 'Yozgi' },
  { key: 'qishki', label: 'Qishki' },
];

const empty = {
  article: '',
  name: '',
  nameRu: '',
  category: 'ready',
  tag: '',
  color: '',
  colorRu: '',
  material: 'Charm',
  materialRu: 'Кожа',
  description: '',
  descriptionRu: '',
  price: '',
  oldPrice: '',
  wholesalePrice: '',
  wholesaleMin: 10,
  sizes: ALL_SIZES,
  inStock: true,
  isActive: true,
  sortOrder: 0,
};

export default function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    product
      ? {
          ...empty,
          ...product,
          nameRu: product.nameRu || '',
          colorRu: product.colorRu || '',
          materialRu: product.materialRu || '',
          description: product.description || '',
          descriptionRu: product.descriptionRu || '',
          tag: product.tag || '',
          oldPrice: product.oldPrice || '',
        }
      : empty
  );
  const [existing, setExisting] = useState(product?.images || []);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSize = (size) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size].sort((a, b) => a - b),
    }));
  };

  const priceNum = Number(form.price) || 0;
  const oldNum = Number(form.oldPrice) || 0;
  const discount = oldNum > priceNum && priceNum > 0 ? Math.round((1 - priceNum / oldNum) * 100) : 0;

  const submit = async (e) => {
    e.preventDefault();
    if (oldNum && oldNum <= priceNum) {
      setError("Eski narx hozirgi narxdan katta bo'lishi kerak (yoki bo'sh qoldiring)");
      return;
    }
    if (existing.length + files.length === 0) {
      setError("Kamida 1 ta rasm qo'shing");
      return;
    }
    setBusy(true);
    setError('');

    const data = new FormData();
    const fields = {
      article: form.article.trim(),
      name: form.name.trim(),
      nameRu: form.nameRu.trim(),
      category: form.category,
      tag: form.tag,
      color: form.color.trim(),
      colorRu: form.colorRu.trim(),
      material: form.material.trim(),
      materialRu: form.materialRu.trim(),
      description: form.description.trim(),
      descriptionRu: form.descriptionRu.trim(),
      price: form.price,
      oldPrice: form.oldPrice,
      wholesalePrice: form.wholesalePrice,
      wholesaleMin: form.wholesaleMin,
      inStock: form.inStock,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    };
    Object.entries(fields).forEach(([key, value]) => data.append(key, value ?? ''));
    data.append('sizes', JSON.stringify(form.sizes));
    data.append('images', JSON.stringify(existing));
    files.forEach((file) => data.append('files', file));

    try {
      if (product) await api.updateProduct(product.id, data);
      else await api.createProduct(data);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <h2>{product ? `Tahrirlash — ${product.article}` : "Yangi mahsulot qo'shish"}</h2>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert">{error}</div>}

          <div className="field full" style={{ marginBottom: 18 }}>
            <label>Rasmlar *</label>
            <ImagePicker
              existing={existing}
              files={files}
              onExisting={setExisting}
              onFiles={setFiles}
              max={8}
            />
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Artikul *</label>
              <input value={form.article} onChange={set('article')} placeholder="ASF-114" required />
            </div>

            <div className="field">
              <label>Kategoriya *</label>
              <select value={form.category} onChange={set('category')}>
                <option value="ready">Tayyor oyoq kiyim</option>
                <option value="upper">Zagatovka (ustki qism)</option>
              </select>
            </div>

            <div className="field">
              <label>Nomi (o'zbekcha) *</label>
              <input value={form.name} onChange={set('name')} required />
            </div>

            <div className="field">
              <label>Nomi (ruscha)</label>
              <input value={form.nameRu} onChange={set('nameRu')} />
            </div>

            <div className="field">
              <label>Teg</label>
              <select value={form.tag} onChange={set('tag')}>
                {TAGS.map((tag) => (
                  <option key={tag.key} value={tag.key}>
                    {tag.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Tartib raqami</label>
              <input type="number" value={form.sortOrder} onChange={set('sortOrder')} />
            </div>

            <div className="field">
              <label>Rang (uz)</label>
              <input value={form.color} onChange={set('color')} placeholder="Qora" />
            </div>

            <div className="field">
              <label>Rang (ru)</label>
              <input value={form.colorRu} onChange={set('colorRu')} placeholder="Чёрный" />
            </div>

            <div className="field">
              <label>Material (uz)</label>
              <input value={form.material} onChange={set('material')} />
            </div>

            <div className="field">
              <label>Material (ru)</label>
              <input value={form.materialRu} onChange={set('materialRu')} />
            </div>

            <div className="field full">
              <label>Tavsif (o'zbekcha)</label>
              <textarea value={form.description} onChange={set('description')} />
            </div>

            <div className="field full">
              <label>Tavsif (ruscha)</label>
              <textarea value={form.descriptionRu} onChange={set('descriptionRu')} />
            </div>

            <div className="field">
              <label>Hozirgi narx — sotiladigan (so'm) *</label>
              <input
                type="number"
                value={form.price}
                onChange={set('price')}
                placeholder="140000"
                required
              />
            </div>

            <div className="field">
              <label>Eski narx — chizib ko'rsatiladi (so'm)</label>
              <input
                type="number"
                min="0"
                value={form.oldPrice}
                onChange={set('oldPrice')}
                placeholder="masalan 165000"
              />
              {discount > 0 ? (
                <span className="hint" style={{ color: 'var(--red, #e11d2e)', fontWeight: 600 }}>
                  🔥 Chegirma: −{discount}% (mijoz {(oldNum - priceNum).toLocaleString('ru-RU')} so'm tejaydi)
                </span>
              ) : oldNum > 0 ? (
                <span className="hint" style={{ color: '#b42318' }}>
                  Eski narx hozirgi narxdan katta bo'lishi kerak
                </span>
              ) : (
                <span className="hint">Bo'sh qoldirsangiz chegirma ko'rinmaydi</span>
              )}
            </div>

            <div className="field">
              <label>Optom narxi (so'm)</label>
              <input
                type="number"
                value={form.wholesalePrice}
                onChange={set('wholesalePrice')}
                placeholder="masalan 125000"
              />
              <span className="hint">
                1 juft narxi. Optom (komplekt) buyurtmalarda shu narx qo'llanadi. Bo'sh
                qoldirsangiz dona narxiga teng bo'ladi
              </span>
            </div>

            <div className="field full">
              <label>Razmerlar (1 komplekt = har biridan bittadan)</label>
              <div className="size-boxes">
                {ALL_SIZES.map((size) => (
                  <button
                    type="button"
                    key={size}
                    className={`size-box${form.sizes.includes(size) ? ' on' : ''}`}
                    onClick={() => toggleSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="checkline">
                <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
                Mini Appda ko'rinsin
              </label>
            </div>

            <div className="field">
              <label className="checkline">
                <input type="checkbox" checked={form.inStock} onChange={set('inStock')} />
                Omborda bor
              </label>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-line" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn" disabled={busy}>
            {busy ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}
