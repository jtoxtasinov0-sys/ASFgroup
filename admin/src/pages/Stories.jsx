import { useCallback, useEffect, useState } from 'react';
import { api, date, imageUrl } from '../lib/api';
import ImagePicker from '../components/ImagePicker';

function StoryForm({ story, products, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: story?.title || '',
    titleRu: story?.titleRu || '',
    productId: story?.productId || '',
    sortOrder: story?.sortOrder ?? 0,
    isActive: story?.isActive ?? true,
  });
  const [existing, setExisting] = useState(story?.image ? [story.image] : []);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (existing.length + files.length === 0) {
      setError('Story uchun rasm tanlang');
      return;
    }
    setBusy(true);
    setError('');

    const data = new FormData();
    data.append('title', form.title.trim());
    data.append('titleRu', form.titleRu.trim());
    data.append('productId', form.productId || '');
    data.append('sortOrder', form.sortOrder);
    data.append('isActive', form.isActive);
    if (existing[0]) data.append('image', existing[0]);
    files.forEach((file) => data.append('files', file));

    try {
      if (story) await api.updateStory(story.id, data);
      else await api.createStory(data);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" style={{ maxWidth: 520 }} onSubmit={submit}>
        <div className="modal-head">
          <h2>{story ? 'Storyni tahrirlash' : "Yangi story qo'shish"}</h2>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert">{error}</div>}

          <div className="field" style={{ marginBottom: 18 }}>
            <label>Story rasmi * (tik / vertikal rasm eng chiroyli chiqadi)</label>
            <ImagePicker
              existing={existing}
              files={files}
              onExisting={setExisting}
              onFiles={(list) => setFiles(list.slice(0, 1))}
              max={1}
              hint="Bitta rasm tanlang"
            />
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Sarlavha (uz) *</label>
              <input value={form.title} onChange={set('title')} placeholder="Yangi kolleksiya" required />
            </div>

            <div className="field">
              <label>Sarlavha (ru)</label>
              <input value={form.titleRu} onChange={set('titleRu')} placeholder="Новая коллекция" />
            </div>

            <div className="field full">
              <label>Mahsulotga bog'lash (ixtiyoriy)</label>
              <select value={form.productId} onChange={set('productId')}>
                <option value="">— bog'lanmagan —</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.article} — {product.name}
                  </option>
                ))}
              </select>
              <span className="hint">
                Bog'lasangiz, storyda mahsulotga o'tish tugmasi paydo bo'ladi
              </span>
            </div>

            <div className="field">
              <label>Tartib raqami</label>
              <input type="number" value={form.sortOrder} onChange={set('sortOrder')} />
            </div>

            <div className="field">
              <label className="checkline" style={{ marginTop: 22 }}>
                <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
                Mini Appda ko'rinsin
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

export default function Stories() {
  const [stories, setStories] = useState(null);
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .stories()
      .then(setStories)
      .catch((err) => {
        setError(err.message);
        setStories([]);
      });
    api.products().then(setProducts).catch(() => {});
  }, []);

  useEffect(load, [load]);

  const remove = async (story) => {
    if (!window.confirm(`"${story.title}" storysi o'chirilsinmi?`)) return;
    try {
      await api.deleteStory(story.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Storylar</h1>
        <button className="btn" onClick={() => setEditing(null)}>
          + Yangi story
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card">
        {stories === null ? (
          <div className="center">
            <div className="spinner" />
          </div>
        ) : stories.length === 0 ? (
          <div className="center">
            <div className="emoji">📸</div>
            Hali story qo'shilmagan
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Rasm</th>
                  <th>Sarlavha</th>
                  <th>Mahsulot</th>
                  <th>Tartib</th>
                  <th>Holat</th>
                  <th>Qo'shilgan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => {
                  const linked = products.find((p) => p.id === story.productId);
                  return (
                    <tr key={story.id}>
                      <td>
                        <img
                          className="thumb"
                          style={{ borderRadius: '50%' }}
                          src={imageUrl(story.image)}
                          alt=""
                        />
                      </td>
                      <td>
                        <b>{story.title}</b>
                        {story.titleRu && <div className="muted">{story.titleRu}</div>}
                      </td>
                      <td className="muted">
                        {linked ? `${linked.article} — ${linked.name}` : '—'}
                      </td>
                      <td className="mono">{story.sortOrder}</td>
                      <td>
                        <span className={`badge ${story.isActive ? 'on' : 'off'}`}>
                          {story.isActive ? 'Faol' : "O'chiq"}
                        </span>
                      </td>
                      <td className="muted nowrap">{date(story.createdAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-line btn-sm" onClick={() => setEditing(story)}>
                            Tahrirlash
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(story)}>
                            O'chirish
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== undefined && (
        <StoryForm
          story={editing}
          products={products}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            load();
          }}
        />
      )}
    </>
  );
}
