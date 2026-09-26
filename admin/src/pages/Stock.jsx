import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, imageUrl } from '../lib/api';
import { frameOf, frameStyle } from '../lib/frame';

const CATS = [
  { key: 'all', label: 'Hammasi' },
  { key: 'ready', label: '👞 Tayyor oyoq kiyim' },
  { key: 'upper', label: '🧵 Zagatovka' },
  { key: 'low', label: '⚠️ Kam qolgan / tugagan' },
];

/** Shu sondan kam qolsa — "kam qoldi" deb belgilanadi */
const LOW = 3;

/** Bazadagi qiymatni forma qatoriga aylantiradi (null — bo'sh maydon = hisoblanmaydi) */
const toRow = (product) => ({
  packs: product.stockPacks === null || product.stockPacks === undefined ? '' : String(product.stockPacks),
  pairs: Object.fromEntries(
    product.sizes.map((size) => [
      size,
      // Juftlar hisoblansa, yozilmagan razmer = 0 (serverda ham shunday)
      product.stockPairs ? String(product.stockPairs[size] ?? 0) : '',
    ])
  ),
});

const sameRow = (a, b) =>
  a.packs === b.packs && Object.keys(a.pairs).every((size) => a.pairs[size] === b.pairs[size]);

const digits = (v) => String(v).replace(/\D/g, '').slice(0, 6);

const num = (v) => (v === '' ? null : Number(v));

/** Qator holati: tugagan / kam qoldi / bor / hisoblanmaydi */
function levelOf(row) {
  const values = [num(row.packs), ...Object.values(row.pairs).map(num)].filter((v) => v !== null);
  if (!values.length) return 'none';
  const packs = num(row.packs);
  const anyPairs = Object.values(row.pairs).some((v) => v !== '');
  const pairsTotal = Object.values(row.pairs).reduce((s, v) => s + (Number(v) || 0), 0);
  const packsEmpty = packs === null || packs === 0;
  const pairsEmpty = !anyPairs || pairsTotal === 0;
  if (packsEmpty && pairsEmpty) return 'out';
  if ((packs !== null && packs < LOW) || Object.values(row.pairs).some((v) => v !== '' && Number(v) < LOW)) {
    return 'low';
  }
  return 'ok';
}

export default function Stock() {
  const [products, setProducts] = useState(null);
  const [rows, setRows] = useState({}); // { id: { packs, pairs } } — tahrirlanayotgan qiymatlar
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setError('');
    api
      .products()
      .then((list) => {
        setProducts(list);
        setRows(Object.fromEntries(list.map((p) => [p.id, toRow(p)])));
      })
      .catch((err) => {
        setError(err.message);
        setProducts([]);
      });
  }, []);

  useEffect(load, [load]);

  const saved = useMemo(
    () => Object.fromEntries((products || []).map((p) => [p.id, toRow(p)])),
    [products]
  );

  const dirtyIds = useMemo(
    () => Object.keys(rows).filter((id) => saved[id] && !sameRow(rows[id], saved[id])),
    [rows, saved]
  );

  const filtered = useMemo(() => {
    if (!products) return [];
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === 'low') {
        const level = levelOf(saved[p.id]);
        if (level !== 'low' && level !== 'out') return false;
      } else if (filter !== 'all' && p.category !== filter) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.article.toLowerCase().includes(query) ||
        String(p.nameRu || '').toLowerCase().includes(query)
      );
    });
  }, [products, filter, search, saved]);

  const setPacks = (id, value) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], packs: digits(value) } }));

  const setPair = (id, size, value) =>
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], pairs: { ...prev[id].pairs, [size]: digits(value) } },
    }));

  /** Tez qo'shish: bo'sh maydon 0 deb olinadi */
  const bump = (id, delta, size) => {
    const row = rows[id];
    const current = Number(size ? row.pairs[size] : row.packs) || 0;
    const next = String(Math.max(0, current + delta));
    if (size) setPair(id, size, next);
    else setPacks(id, next);
  };

  /** Barcha razmerlarga bir xil son */
  const fillPairs = (product) => {
    const value = window.prompt(
      `${product.article}: har bir razmerga nechta juft yozilsin?\n(bo'sh qoldirsangiz — dona savdo hisoblanmaydi)`,
      ''
    );
    if (value === null) return;
    const clean = digits(value);
    setRows((prev) => ({
      ...prev,
      [product.id]: {
        ...prev[product.id],
        pairs: Object.fromEntries(product.sizes.map((size) => [size, clean])),
      },
    }));
  };

  const saveOne = async (id) => {
    const row = rows[id];
    setSaving((prev) => ({ ...prev, [id]: true }));
    try {
      const updated = await api.updateStock(id, {
        stockPacks: row.packs,
        stockPairs: row.pairs,
      });
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setRows((prev) => ({ ...prev, [id]: toRow(updated) }));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const saveAll = async () => {
    setError('');
    setMessage('');
    const ids = [...dirtyIds];
    let ok = 0;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      if (await saveOne(id)) ok += 1;
    }
    if (ok) setMessage(`✅ ${ok} ta mahsulot qoldig'i saqlandi`);
  };

  const reset = (id) => setRows((prev) => ({ ...prev, [id]: saved[id] }));

  const totals = useMemo(() => {
    let packs = 0;
    let pairs = 0;
    let out = 0;
    (products || []).forEach((p) => {
      const row = saved[p.id];
      packs += Number(row.packs) || 0;
      pairs += Object.values(row.pairs).reduce((s, v) => s + (Number(v) || 0), 0);
      if (levelOf(row) === 'out') out += 1;
    });
    return { packs, pairs, out };
  }, [products, saved]);

  return (
    <>
      <div className="page-head">
        <h1>Ombor</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-line" onClick={load}>
            ↻
          </button>
          <button className="btn" onClick={saveAll} disabled={!dirtyIds.length}>
            💾 Saqlash{dirtyIds.length ? ` (${dirtyIds.length})` : ''}
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert ok">{message}</div>}

      <div className="stats">
        <div className="stat">
          <span>Optom uchun</span>
          <b>{totals.packs} komplekt</b>
        </div>
        <div className="stat">
          <span>Donaga sotish uchun</span>
          <b>{totals.pairs} juft</b>
        </div>
        <div className="stat">
          <span>Tugagan modellar</span>
          <b style={totals.out ? { color: 'var(--red)' } : undefined}>{totals.out}</b>
        </div>
      </div>

      <p className="muted stock-help">
        <b>Komplekt</b> — optom savdo uchun (1 komplekt = har razmerdan 1 juft).{' '}
        <b>Juftlar</b> — donaga sotish uchun, har razmer alohida. Ikkalasi alohida hisoblanadi.
        Buyurtma tushganda avtomatik kamayadi, bekor qilinsa qaytadi. Maydon <b>bo'sh</b> bo'lsa —
        hisoblanmaydi (cheklov yo'q), <b>0</b> — tugagan.
      </p>

      <div className="stock-toolbar">
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
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Optom: komplekt</th>
                  <th>Dona: razmer bo'yicha juftlar</th>
                  <th>Holat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const row = rows[product.id];
                  if (!row) return null;
                  const dirty = dirtyIds.includes(String(product.id));
                  const level = levelOf(saved[product.id]);
                  const pairsTotal = Object.values(row.pairs).reduce((s, v) => s + (Number(v) || 0), 0);
                  const pairsOn = Object.values(row.pairs).some((v) => v !== '');
                  return (
                    <tr key={product.id} className={dirty ? 'dirty' : ''}>
                      <td>
                        <div className="stock-model">
                          <div className="thumb">
                            <img
                              src={imageUrl(product.images[0])}
                              alt=""
                              style={frameStyle(frameOf(product, product.images[0]), 1)}
                            />
                          </div>
                          <div>
                            <b>{product.article}</b>
                            <div className="muted">{product.name}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="stock-stepper">
                          <button onClick={() => bump(product.id, -1)} aria-label="Kamaytirish">
                            −
                          </button>
                          <input
                            inputMode="numeric"
                            placeholder="∞"
                            value={row.packs}
                            onChange={(e) => setPacks(product.id, e.target.value)}
                          />
                          <button onClick={() => bump(product.id, 1)} aria-label="Ko'paytirish">
                            +
                          </button>
                        </div>
                        <div className="muted" style={{ marginTop: 4 }}>
                          {row.packs === ''
                            ? 'hisoblanmaydi'
                            : `= ${Number(row.packs) * product.sizes.length} juft`}
                        </div>
                      </td>

                      <td>
                        <div className="stock-sizes">
                          {product.sizes.map((size) => (
                            <label key={size} className="stock-size">
                              <span>{size}</span>
                              <input
                                inputMode="numeric"
                                placeholder="∞"
                                value={row.pairs[size]}
                                onChange={(e) => setPair(product.id, size, e.target.value)}
                                className={
                                  row.pairs[size] === '0'
                                    ? 'zero'
                                    : row.pairs[size] !== '' && Number(row.pairs[size]) < LOW
                                      ? 'low'
                                      : ''
                                }
                              />
                            </label>
                          ))}
                        </div>
                        <div className="muted" style={{ marginTop: 4 }}>
                          {pairsOn ? `Jami: ${pairsTotal} juft · ` : 'hisoblanmaydi · '}
                          <button className="link-btn" onClick={() => fillPairs(product)}>
                            hammasiga bir xil
                          </button>
                        </div>
                      </td>

                      <td>
                        <span className={`badge stock-${level}`}>
                          {level === 'out'
                            ? 'Tugagan'
                            : level === 'low'
                              ? 'Kam qoldi'
                              : level === 'ok'
                                ? 'Bor'
                                : 'Hisobsiz'}
                        </span>
                      </td>

                      <td>
                        {dirty && (
                          <div className="row-actions">
                            <button
                              className="btn btn-sm"
                              disabled={saving[product.id]}
                              onClick={() => {
                                setError('');
                                setMessage('');
                                saveOne(product.id);
                              }}
                            >
                              {saving[product.id] ? '...' : 'Saqlash'}
                            </button>
                            <button className="btn btn-line btn-sm" onClick={() => reset(product.id)}>
                              Bekor
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
