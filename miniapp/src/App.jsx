import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, onApiWaking } from './lib/api';
import { getDict } from './lib/i18n';
import { effectiveColor } from './lib/colors';
import { preloadImages, reloadBrokenImages } from './lib/image';
import { maxPacks, maxPairs } from './lib/stock';
import { cartKey, hasSeenIntro, markIntroSeen, useCart, useLang, useMode } from './lib/store';
import {
  closeApp,
  getTgUser,
  haptic,
  initTelegram,
  isTelegram,
  notifySuccess,
  setBackButton,
} from './lib/telegram';

import BottomNav from './components/BottomNav';
import ClickPayScreen from './components/ClickPayScreen';
import PaymentScreen from './components/PaymentScreen';
import ProductSheet from './components/ProductSheet';
import StoryViewer from './components/StoryViewer';

import Onboarding from './pages/Onboarding';
import ModeSelect from './pages/ModeSelect';
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

const BOOT_KEY = 'asf_boot_v1';

const readBoot = () => {
  try {
    const data = JSON.parse(localStorage.getItem(BOOT_KEY) || 'null');
    return data && data.config && Array.isArray(data.products) ? data : null;
  } catch (_) {
    return null;
  }
};

const writeBoot = (data) => {
  try {
    localStorage.setItem(BOOT_KEY, JSON.stringify(data));
  } catch (_) { /* private rejim yoki joy tugagan */ }
};

export default function App() {
  const [lang, setLang] = useLang();
  const [intro, setIntro] = useState(() => !hasSeenIntro());
  const [savedMode, setMode] = useMode();
  // Har safar ilovaga kirganda avval "Optom / Donaga" tanlanadi
  const [modeOpen, setModeOpen] = useState(true);

  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [waking, setWaking] = useState(false); // server uyg'onishini kutyapmizmi

  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [stories, setStories] = useState([]);
  const [user, setUser] = useState(null);

  const [view, setView] = useState('home');
  const [category, setCategory] = useState('all');
  // Har oshganda katalogdagi qidiruv maydoniga kursor qo'yiladi
  const [searchFocus, setSearchFocus] = useState(0);

  const [sheetProduct, setSheetProduct] = useState(null);
  const [storyIndex, setStoryIndex] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState(null);
  const [seenStories, setSeenStories] = useState(readSeen);

  const cart = useCart();
  const t = getDict(lang || 'uz');
  // Admin donaga savdoni o'chirib qo'ygan bo'lsa — faqat optom
  const retailOn = config?.retailEnabled !== false;
  const mode = retailOn ? savedMode : 'wholesale';

  /* ---------- Boshlang'ich yuklash ---------- */

  // Oxirgi muvaffaqiyatli yuklangan ma'lumot — keyingi ochilishda ilova
  // server javobini kutmasdan darhol ko'rinadi, yangisi fonda yangilanadi
  const load = useCallback(async () => {
    const cached = readBoot();
    if (cached) {
      setConfig(cached.config);
      setProducts(cached.products);
      setStories(cached.stories || []);
      setStatus('ready');
      preloadImages(cached);
    } else {
      setStatus('loading');
    }

    // Profil katalogni kutib turmaydi — parallel so'raladi
    api
      .me()
      .then((profile) => {
        setUser(profile);
        if (!lang) setLang(profile.lang);
      })
      .catch(() => {
        // Telegramdan tashqarida ishlamasligi mumkin
        const tgUser = getTgUser();
        if (tgUser) {
          setUser({ firstName: tgUser.first_name, lastName: tgUser.last_name, username: tgUser.username });
        }
      });

    try {
      const [configData, productList, storyList] = await Promise.all([
        api.getConfig(),
        api.getProducts(),
        api.getStories(),
      ]);
      setConfig(configData);
      setProducts(productList);
      setStories(storyList);
      writeBoot({ config: configData, products: productList, stories: storyList });
      setStatus('ready');
      preloadImages({ products: productList, stories: storyList });
      // Server endi javob beryapti — keshdan ko'rsatilganda yuklanmay qolgan rasmlarni qayta so'raymiz
      setTimeout(reloadBrokenImages, 300);
    } catch (err) {
      // Keshdan ko'rsatilayotgan bo'lsa, xato ekraniga o'tkazmaymiz
      if (cached) return;
      setError(err.message);
      setStatus('error');
    }
  }, [lang, setLang]);

  useEffect(() => {
    initTelegram();
    onApiWaking(setWaking);
    load();
    // Ekrandagi ilova fondan qaytganda — yuklanmay qolgan rasmlarni qayta so'raymiz
    const onVisible = () => document.visibilityState === 'visible' && reloadBrokenImages();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Donaga savdo o'chirilgan: optomga o'tkazamiz ---------- */

  useEffect(() => {
    if (retailOn || !config) return;
    if (savedMode !== 'wholesale') setMode('wholesale');
    setModeOpen(false);
    // Savatchada qolgan donali qatorlar buyurtmada qabul qilinmaydi
    cart.items.filter((item) => item.mode === 'retail').forEach((item) => cart.removeItem(item.key));
  }, [retailOn, config, savedMode, setMode, cart.items, cart.removeItem]);

  /* ---------- Zagatovka faqat optomda sotiladi ---------- */

  const shownProducts = useMemo(
    () => (mode === 'retail' ? products.filter((p) => p.category !== 'upper') : products),
    [products, mode]
  );

  useEffect(() => {
    if (mode === 'retail' && category === 'upper') setCategory('all');
  }, [mode, category]);

  useEffect(() => {
    if (!products.length) return;
    const upper = new Set(products.filter((p) => p.category === 'upper').map((p) => p.id));
    // Avval savatchaga donaga qo'shilgan zagatovkalar buyurtmada qabul qilinmaydi
    cart.items
      .filter((item) => item.mode === 'retail' && upper.has(item.productId))
      .forEach((item) => cart.removeItem(item.key));
  }, [products, cart.items, cart.removeItem]);

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
    const product = shownProducts.find((p) => p.id === Number(id));
    if (product) {
      setStoryIndex(null);
      setSheetProduct(product);
    }
  };

  /**
   * Tezkor qo'shish: optomda — 1 komplekt,
   * donada — 40-razmerdan 1 juft (yoki birinchi mavjud razmer)
   */
  const quickAdd = (product) => {
    const color = effectiveColor(product, null);
    if (cart.cart[cartKey(mode, product.id, color)]) {
      setSheetProduct(product);
      return false;
    }
    // Omborda qolmagan bo'lsa — mahsulot oynasi ochiladi (u yerda "Tugagan" ko'rinadi)
    if (mode === 'wholesale') {
      if (maxPacks(product, cart.items, null) < 1) {
        setSheetProduct(product);
        return false;
      }
      cart.setPacks(product.id, 1, color);
      notifySuccess();
      return true;
    }
    const available = product.sizes.filter((s) => maxPairs(product, s, cart.items, null) > 0);
    if (!available.length) {
      setSheetProduct(product);
      return false;
    }
    const size = available.includes(40) ? 40 : available[0];
    cart.addItem(product.id, { [size]: 1 }, color);
    notifySuccess();
    return true;
  };

  // Tugmaga to'g'ridan-to'g'ri ulansa, bu yerga bosish hodisasi tushib qoladi —
  // shuning uchun faqat matn qabul qilamiz, qolgan hamma holatda "hammasi"
  const goCatalog = (cat) => {
    setCategory(typeof cat === 'string' ? cat : 'all');
    setView('catalog');
  };

  const openTab = (key) => {
    // Yangi bo'lim har doim boshidan ochiladi
    window.scrollTo(0, 0);
    if (key === 'search') {
      setSearchFocus((n) => n + 1);
      setView('catalog');
      return;
    }
    setView(key);
  };

  const pickMode = (value) => {
    setMode(value);
    setModeOpen(false);
    setView('home');
  };

  const reorder = (order) => {
    order.items.forEach((item) => {
      if (item.packs) cart.setPacks(item.productId, item.packs, item.color);
      else if (retailOn) cart.addItem(item.productId, item.sizes, item.color);
    });
    notifySuccess();
    setView('cart');
  };

  /** Katalogni (ombor qoldig'i bilan) serverdan qayta oladi */
  const refreshProducts = () => {
    api
      .getProducts()
      .then((list) => {
        setProducts(list);
        const cached = readBoot();
        if (cached) writeBoot({ ...cached, products: list });
      })
      .catch(() => {});
  };

  const onOrderSuccess = (order) => {
    cart.clear();
    refreshProducts();
    setCheckout(false);
    setSuccess(order);
    // Click tanlangan va sozlangan bo'lsa — "Click / Karta bilan to'lash" oynasi ochiq qoladi
    if (order.payUrls) return;
    // Kartaga o'tkazma — karta raqami va chek yuklash ekrani ochiq qoladi
    if (order.paymentMethod === 'card') return;
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

  // Tanlov ekrani faqat sozlama ma'lum bo'lganda va donaga savdo yoqilgan bo'lsa chiqadi
  if ((modeOpen || !mode) && config && retailOn) {
    return (
      <ModeSelect t={t} lang={lang || 'uz'} setLang={setLang} products={products} onPick={pickMode} />
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

  // Karta ma'lumoti buyurtma javobida ham keladi — eski keshdagi sozlama xalaqit bermasin
  const successPayment = success?.payment?.enabled ? success.payment : config?.payment;
  if (success && success.paymentMethod === 'card' && successPayment?.enabled) {
    return (
      <PaymentScreen
        t={t}
        order={success}
        payment={successPayment}
        company={config.company}
        fresh
        onClose={() => {
          setSuccess(null);
          setView('home');
          closeApp();
        }}
        onUploaded={setSuccess}
      />
    );
  }

  if (success?.payUrls) {
    return (
      <ClickPayScreen
        t={t}
        order={success}
        auto={Boolean(config?.clickAuto)}
        onClose={() => {
          setSuccess(null);
          setView('home');
          closeApp();
        }}
      />
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
        {/* Brauzerda ilova o'zi yopilmaydi — do'konga qaytish tugmasi */}
        {!isTelegram && (
          <button
            className="btn btn-ghost"
            style={{ marginTop: 12, maxWidth: 320 }}
            onClick={() => {
              setSuccess(null);
              setView('home');
            }}
          >
            {t.toHome}
          </button>
        )}
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
          products={shownProducts}
          mode={mode}
          // Donaga savdo o'chirilgan bo'lsa — almashtirish tugmalari ko'rinmaydi
          onSetMode={
            retailOn
              ? (value) => {
                  haptic();
                  setMode(value);
                }
              : null
          }
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
          products={shownProducts}
          config={config}
          category={category}
          setCategory={setCategory}
          mode={mode}
          focusSearch={searchFocus}
          onChangeMode={retailOn ? () => setModeOpen(true) : null}
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
          onChangePacks={cart.changePacks}
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

      <BottomNav view={view} setView={openTab} cartCount={cart.count} t={t} />

      {sheetProduct && (
        <ProductSheet
          product={sheetProduct}
          lang={lang || 'uz'}
          t={t}
          mode={mode}
          cartLine={(m, color) => cart.cart[cartKey(m, sheetProduct.id, color)]}
          cartItems={cart.items}
          onClose={() => setSheetProduct(null)}
          onAdd={cart.addItem}
          onSetPacks={cart.setPacks}
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
          onFailed={refreshProducts}
        />
      )}

      {storyIndex !== null && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          startIndex={storyIndex}
          products={shownProducts}
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
