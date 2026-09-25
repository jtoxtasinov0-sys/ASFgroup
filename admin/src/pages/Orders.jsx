import { useCallback, useEffect, useState } from 'react';
import { api, date, imageUrl, money } from '../lib/api';
import { PAYMENT, colorOf } from '../lib/colors';

/** Rang belgisi: ● Qora */
const ColorTag = ({ color }) => {
  const c = colorOf(color);
  if (!c) return null;
  return (
    <span className="color-tag">
      <i style={{ background: c.hex }} />
      {c.label}
    </span>
  );
};

const STATUSES = [
  { key: 'all', label: 'Hammasi' },
  { key: 'pay:pending', label: '🧾 Chek tekshirish' },
  { key: 'new', label: '🆕 Yangi' },
  { key: 'confirmed', label: '✅ Tasdiqlangan' },
  { key: 'delivered', label: '📦 Yetkazilgan' },
  { key: 'cancelled', label: '❌ Bekor qilingan' },
];

const CATEGORY = {
  ready: 'Tayyor oyoq kiyim',
  upper: 'Zagatovka',
};

/** Buyurtmadagi mahsulot rasmini katta qilib, model ma'lumoti bilan ko'rsatadi */
function ItemPreview({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sizes = Object.entries(item.sizes || {});

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal item-preview">
        <div className="modal-head">
          <h2>
            {item.name} <span className="muted">({item.article})</span>
          </h2>
          <button onClick={onClose} aria-label="Yopish">
            ×
          </button>
        </div>

        {item.image ? (
          <img className="item-preview-img" src={imageUrl(item.image)} alt={item.name} />
        ) : (
          <div className="item-preview-img center">Rasm yo'q</div>
        )}

        <div className="modal-body">
          <dl className="item-preview-info">
            <dt>Model</dt>
            <dd>
              <b>{item.name}</b>
              {item.nameRu && <div className="muted">{item.nameRu}</div>}
            </dd>
            <dt>Artikul</dt>
            <dd className="mono">
              <b>{item.article}</b>
            </dd>
            {CATEGORY[item.category] && (
              <>
                <dt>Turi</dt>
                <dd>{CATEGORY[item.category]}</dd>
              </>
            )}
            {item.color && (
              <>
                <dt>Rang</dt>
                <dd>
                  <ColorTag color={item.color} />
                </dd>
              </>
            )}
            <dt>Savdo</dt>
            <dd>{item.packs ? <b>📦 Optom — {item.packs} komplekt</b> : '🛍 Dona'}</dd>
            <dt>Razmerlar</dt>
            <dd>
              <div className="size-chips">
                {sizes.map(([size, qty]) => (
                  <span key={size} className="size-chip">
                    <b>{size}</b> × {qty}
                  </span>
                ))}
              </div>
            </dd>
            <dt>Soni</dt>
            <dd>
              <b>{item.qty} juft</b>
            </dd>
            <dt>Narxi</dt>
            <dd className="mono">
              {money(item.unitPrice)} so'm
              {item.wholesaleApplied ? ' (optom)' : ''}
            </dd>
            <dt>Jami</dt>
            <dd className="mono">
              <b>{money(item.lineTotal)} so'm</b>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

const LABEL = {
  new: 'Yangi',
  confirmed: 'Tasdiqlandi',
  delivered: 'Yetkazildi',
  cancelled: 'Bekor qilindi',
};

const PAY_LABEL = {
  unpaid: "To'lanmagan",
  pending: 'Chek keldi',
  paid: "To'langan",
  rejected: 'Chek rad etilgan',
};

export default function Orders({ stats, reload }) {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const closePreview = useCallback(() => setPreview(null), []);

  const load = useCallback(() => {
    setOrders(null);
    api
      .orders(filter)
      .then(setOrders)
      .catch((err) => {
        setError(err.message);
        setOrders([]);
      });
  }, [filter]);

  useEffect(load, [load]);

  // Har 30 soniyada yangi buyurtmalarni tekshiradi
  useEffect(() => {
    const timer = setInterval(() => {
      api.orders(filter).then(setOrders).catch(() => {});
      reload();
    }, 30000);
    return () => clearInterval(timer);
  }, [filter, reload]);

  const changeStatus = async (id, status) => {
    try {
      await api.setOrderStatus(id, status);
      load();
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const changePayment = async (id, paymentStatus) => {
    const text = paymentStatus === 'paid' ? "to'lov TASDIQLANSINMI" : 'chek RAD ETILSINMI';
    if (!window.confirm(`#${id} buyurtma: ${text}? Mijozga botdan xabar boradi.`)) return;
    try {
      await api.setPaymentStatus(id, paymentStatus);
      load();
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const clearAll = async () => {
    const typed = window.prompt(
      "DIQQAT! Barcha buyurtmalar butunlay o'chiriladi, statistika 0 ga tushadi " +
        "va raqamlash #1 dan boshlanadi. Buni qaytarib bo'lmaydi.\n\n" +
        'Davom etish uchun TOZALASH deb yozing:'
    );
    if (typed === null) return;
    if (typed.trim().toUpperCase() !== 'TOZALASH') {
      setError("Tozalash bekor qilindi — TOZALASH so'zi noto'g'ri yozildi");
      return;
    }
    try {
      await api.clearOrders();
      setError('');
      load();
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`#${id} raqamli buyurtma o'chirilsinmi?`)) return;
    try {
      await api.deleteOrder(id);
      load();
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Buyurtmalar</h1>
        <div className="row-actions">
          <button className="btn btn-line" onClick={load}>
            ↻ Yangilash
          </button>
          <button className="btn btn-danger" onClick={clearAll}>
            🗑 Hammasini tozalash
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span>Jami buyurtma</span>
          <b>{stats?.total ?? '—'}</b>
        </div>
        <div className="stat">
          <span>Yangi</span>
          <b style={{ color: 'var(--red)' }}>{stats?.newCount ?? '—'}</b>
        </div>
        <div className="stat">
          <span>Chek tekshirish</span>
          <b style={{ color: 'var(--amber)' }}>{stats?.pendingPayments ?? '—'}</b>
        </div>
        <div className="stat">
          <span>Yetkazilgan</span>
          <b style={{ color: 'var(--green)' }}>{stats?.delivered ?? '—'}</b>
        </div>
        <div className="stat">
          <span>Umumiy summa</span>
          <b>{stats ? `${money(stats.revenue)} so'm` : '—'}</b>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="filters" style={{ marginBottom: 16 }}>
        {STATUSES.map((s) => (
          <button
            key={s.key}
            className={`chip${filter === s.key ? ' active' : ''}`}
            onClick={() => setFilter(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="card">
        {orders === null ? (
          <div className="center">
            <div className="spinner" />
          </div>
        ) : orders.length === 0 ? (
          <div className="center">
            <div className="emoji">📭</div>
            Bu bo'limda buyurtma yo'q
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Mijoz</th>
                  <th>Mahsulotlar</th>
                  <th>Manzil</th>
                  <th className="nowrap">Jami</th>
                  <th>Sana</th>
                  <th>Holat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="mono">
                      <b>#{order.id}</b>
                    </td>

                    <td style={{ minWidth: 150 }}>
                      <b>{order.customerName}</b>
                      <div className="muted">
                        <a href={`tel:${order.phone.replace(/\s/g, '')}`}>{order.phone}</a>
                      </div>
                      {order.user?.username && (
                        <div className="muted">@{order.user.username}</div>
                      )}
                    </td>

                    <td style={{ minWidth: 240 }}>
                      <div className="order-items">
                        {order.items.map((item) => (
                          <div
                            className="order-item"
                            key={`${item.productId}-${item.mode || 'retail'}-${item.color || ''}`}
                          >
                            <button
                              type="button"
                              className="order-item-img"
                              onClick={() => setPreview(item)}
                              title="Kattalashtirish"
                            >
                              <img src={imageUrl(item.image)} alt={item.name} />
                            </button>
                            <div>
                              <b>{item.name}</b>{' '}
                              <span className="muted">({item.article})</span>{' '}
                              <ColorTag color={item.color} />
                              <div className="muted">
                                {item.packs ? (
                                  <b className="pack-badge">📦 {item.packs} komplekt</b>
                                ) : (
                                  <span className="pack-badge retail">🛍 Dona</span>
                                )}{' '}
                                {item.packs
                                  ? Object.keys(item.sizes).join(', ')
                                  : Object.entries(item.sizes)
                                      .map(([size, qty]) => `${size}×${qty}`)
                                      .join(', ')}{' '}
                                = {item.qty} juft · {money(item.unitPrice)}
                                {item.wholesaleApplied ? ' (optom)' : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {order.comment && (
                        <div className="muted" style={{ marginTop: 6 }}>
                          💬 {order.comment}
                        </div>
                      )}
                    </td>

                    <td style={{ minWidth: 140 }}>
                      <b>{order.region}</b>
                      <div className="muted">{order.address}</div>
                    </td>

                    <td className="mono nowrap">
                      <b>{money(order.total)}</b>
                      <div className={`pay-tag ${order.paymentMethod || 'cash'}`}>
                        {PAYMENT[order.paymentMethod] || PAYMENT.cash}
                      </div>
                      <div className="muted">
                        {(() => {
                          const packs = order.items.reduce((sum, i) => sum + (i.packs || 0), 0);
                          return packs ? `${packs} komplekt · ` : '';
                        })()}
                        {order.totalQty} juft
                      </div>
                      {order.isWholesale && <span className="badge on">optom</span>}

                      {order.paymentMethod === 'card' && (
                        <div className="pay-box">
                          <span className={`badge pay-${order.paymentStatus}`}>
                            {PAY_LABEL[order.paymentStatus] || order.paymentStatus}
                          </span>
                          {order.receiptUrl && (
                            <a
                              className="receipt-thumb"
                              href={imageUrl(order.receiptUrl)}
                              target="_blank"
                              rel="noreferrer"
                              title="Chekni kattalashtirish"
                            >
                              <img src={imageUrl(order.receiptUrl)} alt="Chek" />
                            </a>
                          )}
                          {order.paymentStatus === 'pending' && (
                            <div className="row-actions" style={{ marginTop: 6 }}>
                              <button className="btn btn-sm" onClick={() => changePayment(order.id, 'paid')}>
                                ✅ Tasdiqlash
                              </button>
                              <button
                                className="btn btn-line btn-sm"
                                onClick={() => changePayment(order.id, 'rejected')}
                              >
                                Rad etish
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="muted nowrap">{date(order.createdAt)}</td>

                    <td>
                      <span className={`badge ${order.status}`}>{LABEL[order.status]}</span>
                      <select
                        style={{ marginTop: 7, fontSize: 12, padding: '6px 8px' }}
                        value={order.status}
                        onChange={(e) => changeStatus(order.id, e.target.value)}
                      >
                        <option value="new">Yangi</option>
                        <option value="confirmed">Tasdiqlash</option>
                        <option value="delivered">Yetkazildi</option>
                        <option value="cancelled">Bekor qilish</option>
                      </select>
                    </td>

                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(order.id)}>
                        O'chirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {preview && <ItemPreview item={preview} onClose={closePreview} />}
    </>
  );
}
