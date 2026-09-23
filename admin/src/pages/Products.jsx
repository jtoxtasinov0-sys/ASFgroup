import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, imageUrl, money } from '../lib/api';
import ProductForm from '../components/ProductForm';

const CATS = [
  { key: 'all', label: 'Hammasi' },
  { key: 'ready', label: '👞 Tayyor oyoq kiyim' },
  { key: 'upper', label: '🧵 Zagatovka' },
];

export default function Products({ reload }) {
  const [products, setProducts] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = yopiq, null = yangi
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .products()
      .then(setProducts)
      .catch((err) => {
        setError(err.message);
        setProducts([]);
      });
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.article.toLowerCase().includes(query) ||
        String(p.nameRu || '').toLowerCase().includes(query)
      );
    });
  }, [products, filter, search]);

  const remove = async (product) => {
    if (!window.confirm(`"${product.name}" (${product.article}) o'chirilsinmi?`)) return;
    try {
      await api.deleteProduct(product.id);
      load();
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Mahsulotlar</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-line" onClick={load}>
            ↻
          </button>
          <button className="btn" onClick={() => setEditing(null)}>
            + Yangi mahsulot
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div className="filters">
          {CATS.map((cat) => (
            <button
              key={cat.key}
              className={`chip${filter === cat.key ? ' active' : ''}`}
              onClick={() => setFilter(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <input
          style={{ maxWidth: 250 }}
          placeholder="Nomi yoki artikul bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {products === null ? (
          <div className="center">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="center">
            <div className="emoji">📦</div>
            Mahsulot topilmadi
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Rasm</th>
                  <th>Artikul</th>
                  <th>Nomi</th>
                  <th>Kategoriya</th>
                  <th className="nowrap">Dona narxi</th>
                  <th className="nowrap">Optom</th>
                  <th>Razmerlar</th>
                  <th>Holat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <img className="thumb" src={imageUrl(product.images[0])} alt="" />
                    </td>
                    <td className="mono nowrap">
                      <b>{product.article}</b>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <b>{product.name}</b>
                      {product.nameRu && <div className="muted">{product.nameRu}</div>}
                      {product.color && <div className="muted">{product.color}</div>}
                    </td>
                    <td>
                      <span className={`badge ${product.category}`}>
                        {product.category === 'ready' ? 'Tayyor' : 'Zagatovka'}
                      </span>
                      {product.tag && (
                        <div className="muted" style={{ marginTop: 4 }}>
                          #{product.tag}
                        </div>
                      )}
                    </td>
                    <td className="mono nowrap">
                      <b>{money(product.price)}</b>
                      {product.oldPrice > product.price ? (
                        <div className="muted">
                          <span style={{ textDecoration: 'line-through' }}>{money(product.oldPrice)}</span>{' '}
                          <span className="badge sale">
                            −{Math.round((1 - product.price / product.oldPrice) * 100)}%
                          </span>
                        </div>
                      ) : null}
                    </td>
                    <td className="mono nowrap">
                      {product.wholesalePrice < product.price ? (
                        <>
                          <b style={{ color: 'var(--green)' }}>{money(product.wholesalePrice)}</b>
                          <div className="muted">{product.wholesaleMin} juftdan</div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="mono muted nowrap">{product.sizes.join(' ')}</td>
                    <td>
                      <span className={`badge ${product.isActive ? 'on' : 'off'}`}>
                        {product.isActive ? 'Faol' : "O'chiq"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-line btn-sm" onClick={() => setEditing(product)}>
                          Tahrirlash
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(product)}>
                          O'chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== undefined && (
        <ProductForm
          product={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            load();
            reload();
          }}
        />
      )}
    </>
  );
}
