import { useCallback, useEffect, useState } from 'react';

import { api, onApiWaking } from './lib/api';
import { getDict } from './lib/i18n';
import { hasSeenIntro, markIntroSeen, useCart, useLang } from './lib/store';
import {
  closeApp,
  getTgUser,
  initTelegram,
  notifySuccess,
  setBackButton,
} from './lib/telegram';

import BottomNav from './components/BottomNav';
import ProductSheet from './components/ProductSheet';
import StoryViewer from './components/StoryViewer';

import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';

const SEEN_STORIES_KEY = 'asf_seen_stories';

const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_STORIES_KEY) || '[]');
  } catch (_) {
    return [];
  }
};

export default function App() {
  const [lang, setLang] = useLang();
  const [intro, setIntro] = useState(() => !hasSeenIntro());

  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [waking, setWaking] = useState(false); // server uyg'onishini kutyapmizmi

  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [stories, setStories] = useState([]);
  const [user, setUser] = useState(null);

  const [view, setView] = useState('home');
  const [category, setCategory] = useState('all');

  const [sheetProduct, setSheetProduct] = useState(null);
  const [storyIndex, setStoryIndex] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState(null);
  const [seenStories, setSeenStories] = useState(readSeen);

  const cart = useCart();
  const t = getDict(lang || 'uz');

  /* ---------- Boshlang'ich yuklash ---------- */

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [configData, productList, storyList] = await Promise.all([
        api.getConfig(),
        api.getProducts(),
        api.getStories(),
      ]);
      setConfig(configData);
      setProducts(productList);
      setStories(storyList);

      // Foydalanuvchi — Telegramdan tashqarida ishlamasligi mumkin
      try {
        const profile = await api.me();
        setUser(profile);
        if (!lang) setLang(profile.lang);
      } catch (_) {
        const tgUser = getTgUser();
        if (tgUser) {
          setUser({ firstName: tgUser.first_name, lastName: tgUser.last_name, username: tgUser.username });
        }
      }

      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [lang, setLang]);

  useEffect(() => {
    initTelegram();
    onApiWaking(setWaking);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Tilni serverga saqlash ---------- */

  useEffect(() => {
    if (!lang || !user?.telegramId) return;
    if (user.lang === lang) return;
    api.updateProfile({ lang }).then(setUser).catch(() => {});
  }, [lang, user]);

  /* ---------- Telegramning "orqaga" tugmasi ---------- */

  useEffect(() => {
    const overlayOpen = Boolean(sheetProduct || checkout || storyIndex !== null);
    const goBack = () => {
      if (storyIndex !== null) setStoryIndex(null);
      else if (checkout) setCheckout(false);
      else if (sheetProduct) setSheetProduct(null);
    };
    return setBackButton(overlayOpen, goBack);
  }, [sheetProduct, checkout, storyIndex]);

  /* ---------- Amallar ---------- */

  const markStorySeen = useCallback((id) => {
    setSeenStories((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(SEEN_STORIES_KEY, JSON.stringify(next));
      } catch (_) { /* private rejim */ }
      return next;
    });
  }, []);

  const openProductById = (id) => {
    const product = products.find((p) => p.id === Number(id));
    if (product) {
      setStoryIndex(null);
      setSheetProduct(product);
    }
  };

  /** Tezkor qo'shish: 40-razmerdan 1 juft (yoki birinchi mavjud razmer) */
  const quickAdd = (product) => {
    if (cart.cart[product.id]) {
      setSheetProduct(product);
      return;
    }
    const size = product.sizes.includes(40) ? 40 : product.sizes[0];
    cart.addItem(product.id, { [size]: 1 });
    notifySuccess();
  };

  // Tugmaga to'g'ridan-to'g'ri ulansa, bu yerga bosish hodisasi tushib qoladi —
  // shuning uchun faqat matn qabul qilamiz, qolgan hamma holatda "hammasi"
  const goCatalog = (cat) => {
    setCategory(typeof cat === 'string' ? cat : 'all');
    setView('catalog');
  };

  const reorder = (order) => {
    order.items.forEach((item) => cart.addItem(item.productId, item.sizes));
    notifySuccess();
    setView('cart');
  };

  const onOrderSuccess = (order) => {
    cart.clear();
    setCheckout(false);
    setSuccess(order);
    // Mini App 2.5 soniyadan so'ng yopiladi — bot xabari Telegramda ko'rinadi
    setTimeout(closeApp, 2500);
  };

  /* ---------- Ekranlar ---------- */

  if (intro) {
    return (
      <Onboarding
        t={t}
        lang={lang || 'uz'}
        setLang={setLang}
        onDone={() => {
          markIntroSeen();
          api.updateProfile({ seenIntro: true }).catch(() => {});
          setIntro(false);
        }}
      />
    );
  }

  if (status === 'loading') {
    return (
      <div className="center" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span className="muted">{waking ? t.waking : t.loading}</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="center" style={{ minHeight: '100vh' }}>
        <div className="emoji">📡</div>
        <b>{error}</b>
        <span className="muted">{t.connectionHint}</span>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={load}>
          {t.retry}
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="success">
        <div className="check">✓</div>
        <h1 className="h1">{t.successTitle}</h1>
        <p className="muted">{t.successText}</p>
        <div className="pricetag big" style={{ marginTop: 10 }}>
          <b>
            {t.orderNo} #{success.id}
          </b>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === 'home' && (
        <Home
          t={t}
          lang={lang || 'uz'}
          setLang={setLang}
          user={user}
          stories={stories}
          seenStories={seenStories}
          onOpenStory={setStoryIndex}
          products={products}
          cart={cart.cart}
          onOpenProduct={setSheetProduct}
          onQuickAdd={quickAdd}
          goCatalog={goCatalog}
        />
      )}

      {view === 'catalog' && (
        <Catalog
          t={t}
          lang={lang || 'uz'}
          products={products}
          config={config}
          category={category}
          setCategory={setCategory}
          cart={cart.cart}
          onOpenProduct={setSheetProduct}
          onQuickAdd={quickAdd}
        />
      )}

      {view === 'cart' && (
        <Cart
          t={t}
          lang={lang || 'uz'}
          cartItems={cart.items}
          products={products}
          onChangeSize={cart.changeSize}
          onRemove={cart.removeItem}
          onCheckout={() => setCheckout(true)}
          goCatalog={() => goCatalog()}
        />
      )}

      {view === 'profile' && (
        <Profile
          t={t}
          lang={lang || 'uz'}
          setLang={setLang}
          user={user}
          config={config}
          onReorder={reorder}
        />
      )}

      <BottomNav view={view} setView={setView} cartCount={cart.totalQty} t={t} />

      {sheetProduct && (
        <ProductSheet
          product={sheetProduct}
          lang={lang || 'uz'}
          t={t}
          initialSizes={cart.cart[sheetProduct.id]?.sizes}
          onClose={() => setSheetProduct(null)}
          onAdd={cart.addItem}
        />
      )}

      {checkout && (
        <Checkout
          t={t}
          lang={lang || 'uz'}
          config={config}
          user={user}
          cartItems={cart.items}
          onClose={() => setCheckout(false)}
          onSuccess={onOrderSuccess}
        />
      )}

      {storyIndex !== null && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          startIndex={storyIndex}
          lang={lang || 'uz'}
          t={t}
          onClose={() => setStoryIndex(null)}
          onSeen={markStorySeen}
          onProduct={openProductById}
        />
      )}
    </>
  );
}
