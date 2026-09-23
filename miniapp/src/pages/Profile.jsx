import { useEffect, useState } from 'react';
import { api, imageUrl } from '../lib/api';
import { date, money } from '../lib/format';
import { haptic } from '../lib/telegram';

export default function Profile({ t, lang, setLang, user, config, onReorder }) {
  const [orders, setOrders] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || orders) return;
    api.myOrders().then(setOrders).catch(() => setOrders([]));
  }, [open, orders]);

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'ASF';
  const initials = name.slice(0, 1).toUpperCase();

  return (
    <div className="page">
      <div className="wrap" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
        <h1 className="h1" style={{ marginBottom: 14 }}>
          {t.profile}
        </h1>

        <div className="profile-head">
          <div className="avatar">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              {user?.phone || (user?.username ? `@${user.username}` : 'ASF GROUP')}
            </div>
          </div>
        </div>

        <div className="rows">
          <button
            className="row-item"
            onClick={() => {
              haptic();
              setOpen(!open);
            }}
          >
            <span>{t.myOrders}</span>
            <span className="arrow">{open ? '▾' : '›'}</span>
          </button>

          {open && (
            <div style={{ padding: 14, background: 'var(--bg-soft)' }}>
              {orders === null ? (
                <div className="center" style={{ minHeight: 100 }}>
                  <div className="spinner" />
                </div>
              ) : orders.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', padding: 14 }}>
                  {t.noOrders}
                </div>
              ) : (
                orders.map((order) => (
                  <div className="order-card" key={order.id} style={{ background: '#fff' }}>
                    <div className="order-top">
                      <b>#{order.id}</b>
                      <span className={`badge ${order.status}`}>
                        {t.statuses[order.status] || order.status}
                      </span>
                    </div>

                    <div className="muted" style={{ marginBottom: 6 }}>
                      {date(order.createdAt)}
                    </div>

                    {order.items.map((item) => (
                      <div className="order-line" key={`${item.productId}-${item.mode || 'retail'}`}>
                        <img src={imageUrl(item.image)} alt="" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>
                            {lang === 'ru' && item.nameRu ? item.nameRu : item.name}
                          </div>
                          <div className="muted">
                            {item.packs
                              ? `📦 ${item.packs} ${t.pack} (${Object.keys(item.sizes).join(', ')})`
                              : Object.entries(item.sizes)
                                  .map(([size, qty]) => `${size}×${qty}`)
                                  .join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 10,
                      }}
                    >
                      <b>
                        {money(order.total)} {t.sum}
                      </b>
                      <button className="btn btn-line btn-sm" onClick={() => onReorder(order)}>
                        {t.reorder}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <button
            className="row-item"
            onClick={() => {
              haptic();
              setLang(lang === 'uz' ? 'ru' : 'uz');
            }}
          >
            <span>{t.language}</span>
            <span style={{ color: 'var(--navy)', fontWeight: 600 }}>
              {lang === 'uz' ? "O'zbekcha" : 'Русский'}
            </span>
          </button>

          <a
            className="row-item"
            href={`tel:${(config?.company?.phone || '').replace(/\s/g, '')}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span>{t.contactUs}</span>
            <span style={{ color: 'var(--navy)', fontWeight: 600, fontSize: 13 }}>
              {config?.company?.phone}
            </span>
          </a>
        </div>

        <div className="section">
          <h2 className="h2">{t.aboutUs}</h2>
          <p className="muted" style={{ marginTop: 8, lineHeight: 1.55 }}>
            {t.aboutText}
          </p>
          <p className="muted" style={{ marginTop: 10 }}>
            📍 {config?.company?.address}
          </p>
        </div>
      </div>
    </div>
  );
}
