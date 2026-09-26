# SHABLON: Telegram do'kon (Bot + Mini App + Admin panel)

> **Claude uchun ko'rsatma.** Bu fayl — tayyor ishlagan loyihaning (ASF GROUP, poyabzal)
> to'liq tavsifi. Yangi loyihada xuddi shu tizimni **noldan qurib ber**, faqat pastdagi
> **"1. YANGI BREND ANKETASI"** bo'limidagi ma'lumotlarga moslab: nom, logo, ranglar,
> kategoriyalar, mahsulot turi, razmerlar, narxlar, tillar. Anketada bo'sh qolgan joy
> bo'lsa — ASF GROUP dagi qiymatni ol yoki mendan so'ra.
>
> Foydalanuvchi dasturchi emas: hamma tushuntirish **o'zbek tilida, qadam-baqadam**,
> komandalarni alohida blokda ber. Kod izohlari ham o'zbekcha.

---

## 1. YANGI BREND ANKETASI (har yangi loyihada to'ldiriladi)

| Nima | Qiymat |
|---|---|
| Brend nomi | `__________` (ASF da: ASF GROUP) |
| Shior (slogan) | `__________` (ASF da: SIFAT VA ISHONCH) |
| Nima sotiladi | `__________` (ASF da: poyabzal — tayyor oyoq kiyim va zagatovka) |
| Logo | `logo.png` faylini loyihaga tashlayman |
| Asosiy rang (urg'u) | `#______` (ASF da: to'q ko'k `#16243f`) |
| Qo'shimcha rang | `#______` (ASF da: qizil `#e11d2e` — chegirma, "tugagan") |
| Kategoriyalar | masalan: `ready` = Tayyor oyoq kiyim, `upper` = Zagatovka |
| Teglar (filtr) | masalan: Klassik, Sport, Mokasin, Yozgi, Qishki... |
| Razmerlar | masalan: 39, 40, 41, 42, 43 (yoki S/M/L, yoki razmer yo'q) |
| O'lchov birligi | masalan: juft (poyabzal), dona, kg, metr |
| Optom birligi | masalan: komplekt = har razmerdan 1 tadan |
| Mahsulot ranglari | masalan: Qora, Jigarrang, Ko'k (+ qo'lda istalgan rang) |
| Dona narx / optom narx | masalan: 140 000 / 125 000 so'm |
| Tillar | o'zbek + rus (yoki boshqa) |
| Yetkazib berish hududi | O'zbekiston viloyatlari (yoki boshqa) |
| To'lov usullari | Naqd, Click, Kartaga o'tkazma (Uzcard/Humo + chek) |
| Kompaniya telefoni, manzili | `__________` |
| Bot username | `@__________bot` (BotFather'dan) |
| Domen nomlari | Render: `______.onrender.com`, Vercel: `______-miniapp`, `______-admin` |

---

## 2. Umumiy arxitektura

Bitta GitHub repo, uchta papka:

| Qism | Papka | Texnologiya | Qayerda ishlaydi |
|---|---|---|---|
| Backend + Telegram bot + API | `backend/` | Node.js 20, Express, Prisma, node-telegram-bot-api, multer, jsonwebtoken | **Render.com** (Web Service, Root = `backend`) |
| Mini App (mijozlar do'koni) | `miniapp/` | React 18 + Vite 5 (qo'shimcha UI kutubxonasiz, oddiy CSS) | **Vercel** (Root = `miniapp`) |
| Admin panel | `admin/` | React 18 + Vite 5, oddiy CSS | **Vercel** (Root = `admin`) |
| Baza | — | PostgreSQL | **Neon** (bepul) |

Lokal portlar: backend `5000`, miniapp `5173`, admin `5174`.

Qo'shimcha fayllar:
- `README.md` — kompyuterda ishga tushirish (o'zbekcha, qadam-baqadam)
- `DEPLOY.md` — Render + Vercel + Neon ga joylash qo'llanmasi, xatolar jadvali bilan
- `1-BAZANI-TAYYORLASH.bat`, `2-BACKEND.bat`, `3-ADMIN-PANEL.bat`, `4-MINIAPP.bat`, `5-TELEGRAM-UCHUN-BUILD.bat` — ikki marta bosib ishga tushirish uchun
- `.github/workflows/keep-alive.yml` — har 10 daqiqada `/api/health` ga ping (Render uxlamasin)
- `.claude/launch.json` — preview serverlari

### Backend papka tuzilishi

```
backend/
├── prisma/schema.prisma       # jadvallar
├── prisma/seed.js             # boshlang'ich mahsulotlar (bor bo'lsa tegmaydi; SEED_FORCE=1 — qayta yozadi)
├── uploads/products|stories|receipts|broadcast/   # rasmlar
└── src/
    ├── config/default.js      # BREND SOZLAMALARI: kompaniya, kategoriyalar, teglar, viloyatlar, razmerlar, ranglar, Click, karta
    ├── core/bot.js            # bot yaratish, webhook/polling, safeSend, notifyAdmins, rasm bilan xabar, Menu tugmasi
    ├── core/broadcast.js      # rassilka (soniyasiga ~20 ta)
    ├── database/connection.js # Prisma
    ├── models/                # User, Product, Order, Story, Setting
    ├── controllers/           # botController, cartController (mijoz), adminController
    ├── routes/                # bot.routes, client.routes (/api), admin.routes (/api/admin)
    ├── middlewares/auth.middleware.js  # Telegram initData HMAC tekshiruvi + admin JWT
    ├── services/payment.js    # karta, chek, Tasdiqlash/Rad etish
    ├── services/stock.js      # ombor: buyurtmada ayirish / bekor qilinsa qaytarish (tranzaksiyada)
    ├── utils/i18n.js          # bot matnlari (uz/ru), adminga xabar shablonlari
    ├── utils/colors.js        # rang kalitlari va qo'lda kiritilgan ranglar
    ├── utils/upload.js        # multer, fayl yo'llari
    └── index.js               # Express, /uploads statik, /api/health, webhook yo'li, o'zini ping qilish
```

### Mini App tuzilishi

```
miniapp/src/
├── pages/      Onboarding, ModeSelect, Home, Catalog, Cart, Checkout, Profile
├── components/ BottomNav, ProductCard, ProductSheet, PriceTag, PhotoViewer, Stories, StoryViewer, PaymentScreen
└── lib/        api (qayta urinish bilan), telegram (WebApp, haptic), i18n (uz/ru), store (savatcha), stock, colors, frame, image, format
```

### Admin panel tuzilishi

```
admin/src/
├── pages/      Login, Orders, Products, Stock, Stories, Users, Broadcast, Settings
├── components/ ProductForm, ImagePicker, ImageEditor (rasmni kesish/joylash)
└── lib/        api, colors, frame
```

---

## 3. Baza jadvallari (Prisma)

- **User** — `telegramId` (unique), ism, familiya, username, telefon, `lang` (uz/ru), `seenIntro`, `isAdmin` (botda `/admin PAROL` qilgan)
- **Product** — `article` (unique), `name`/`nameRu`, `description`/`descriptionRu`, `category`, `tag`, `material`/`materialRu`,
  `images[]`, `imageFrames` (har rasm uchun zoom/joylashuv), `imageColors` (har rasm qaysi rangga tegishli),
  `price` (dona), `oldPrice` (chizilgan), `wholesalePrice` (optom), `wholesaleMin`, `sizes[]`, `inStock`,
  `stockPacks` (optom komplekt qoldig'i, null = hisoblanmaydi), `stockPairs` (dona: razmer bo'yicha qoldiq JSON, null = hisoblanmaydi),
  `isActive`, `sortOrder`
- **Order** — `items` (JSON: productId, article, name, image, color, mode, packs, sizes, qty, unitPrice, lineTotal),
  `totalQty`, `total`, `isWholesale`, mijoz ismi/telefon/viloyat/manzil/izoh,
  `paymentMethod` (cash | click | card), `paymentStatus` (unpaid | pending | paid | rejected), `receiptUrl`, `receiptAt`,
  `status` (new | confirmed | delivered | cancelled)
- **Setting** — key/value (to'lov kartasi, `retailEnabled` va h.k. — admin paneldan o'zgaradi)
- **Story** — sarlavha uz/ru, rasm, ixtiyoriy mahsulotga bog'lanish

---

## 4. Telegram bot imkoniyatlari

- `/start` — salom xabari + **🛍 Do'konni ochish** (web_app) tugmasi; adminlarga qo'shimcha **🛠 Admin panel** tugmasi
- `/help` — `/start` bilan bir xil
- `/id` — chat ID ni ko'rsatadi (ADMIN_CHAT_IDS ga yozish uchun; guruhda ham ishlaydi)
- `/admin PAROL` — odamni admin qiladi (parolli xabar o'chiriladi, 1 soatda 5 ta xato urinish chegarasi)
- Kontakt yuborish — telefonni profilga saqlaydi
- Til tanlash (uz/ru) tugmalari
- Mijoz chek rasmini botga yuborsa — oxirgi to'lanmagan buyurtmaga biriktiriladi
- Pastki **Menu** tugmasi: mijozlarda Mini App, adminlarda Admin panel ochadi (avtomatik o'rnatiladi)
- **Webhook rejimi** (https bo'lsa) — Render bepul rejada uxlagan servisni Telegram so'rovi uyg'otadi.
  Lokal (http) bo'lsa — polling. Webhook yo'li token hash'idan yasaladi + `secret_token` tekshiriladi.

### Adminga keladigan xabarlar

1. **Yangi buyurtma — BITTA xabar:** tepada mahsulot **rasmi** (tanlangan rangdagi; bir nechta mahsulot bo'lsa — albom),
   ostida to'liq ma'lumot: 🆕 Yangi (OPTOM) buyurtma #N, mahsulotlar ro'yxati (artikul, 🎨 rang, komplekt/razmerlar,
   soni × narx), jami, summa, to'lov usuli, **to'lov holati** (hali qilinmadi / chek yuborildi — tekshiring /
   tasdiqlangan / rad etilgan), mijoz ismi, telefon, manzil, izoh, Telegram havolasi (`tg://user?id=`).
   Matn 1024 belgidan uzun bo'lsa (Telegram chegarasi) — rasmlar, keyin alohida matn. Rasm topilmasa — faqat matn.
   Rasm bir marta yuklanadi, qolgan adminlarga `file_id` orqali boradi.
2. **Chek keldi:** chek rasmi + buyurtma ma'lumoti + **✅ Tasdiqlash / ❌ Rad etish** tugmalari.
   Bosilganda mijozga avtomatik xabar boradi.
3. Buyurtma holati o'zgarsa (tasdiqlandi/yetkazildi/bekor) — **mijozga** botdan xabar.

Adminlar ro'yxati = `ADMIN_CHAT_IDS` (env, vergul bilan, guruh ID minus bilan) + bazadagi `isAdmin`.

---

## 5. Mini App (mijoz) imkoniyatlari

- **Onboarding** — 3 slayd (logo, qanday ishlaydi, optom/dona), bir marta ko'rsatiladi; til almashtirish UZ/RU
- **ModeSelect** — kirganda "Ulgurji (optom)" yoki "Donaga" tanlash; keyin istalgan payt tepadagi tab bilan almashtiriladi.
  Admin donaga savdoni o'chirsa — faqat optom ko'rinadi
- **Home** — salomlashish (Telegram ismi), Stories doiralari, hero banner, kategoriya kartalari, mashhur mahsulotlar
- **Catalog** — kategoriya, teg filtrlari, qidiruv, mahsulot kartalari (narx, eski narx, "tugagan", qoldiq)
- **ProductSheet** (pastdan chiqadigan oyna) — rasmlar karuseli, **rang tanlash** (rasm rangiga qarab), to'liq ekran PhotoViewer,
  optomda — komplekt soni (+/−), donada — razmer bo'yicha juft soni; ombor qoldig'i; "optomda N so'm arzon" maslahati
- **Cart** — optom va dona bo'limlari alohida, narxlar **serverda qayta hisoblanadi** (`/api/cart/calculate`)
- **Checkout** — ism, telefon, viloyat (ro'yxatdan), manzil, izoh, to'lov usuli: Naqd / Click / Kartaga o'tkazma
- **PaymentScreen** — karta raqami (nusxalash), summa, chek rasmini yuklash
- **Profile** — ma'lumotlar, til, **Mening buyurtmalarim** (holat, to'lov holati, "qayta buyurtma"), kompaniya bilan bog'lanish
- **BottomNav** — Bosh sahifa, Katalog, Savatcha (soni bilan), Profil
- Telegram haptic, xavfsiz zona (safe-area), server uxlab qolsa — 3 marta qayta urinish va "Server uyg'onmoqda..." yozuvi
- Brauzerda (Telegram tashqarisida, production emas) — "Demo Mijoz" nomidan ishlaydi

Dizayn: oq fon, bitta to'q urg'u rangi, yumaloq burchaklar (10–26px), yumshoq soyalar, minimalist.
CSS o'zgaruvchilari `:root` da (`--navy`, `--red`, `--green`, `--ink`, `--muted`, `--line`, `--bg`, `--r-*`, `--shadow-*`) —
**yangi brendda faqat shu ranglarni almashtirish kifoya**.

---

## 6. Admin panel imkoniyatlari

- **Kirish:** login/parol (JWT, 30 kun) yoki Telegram ichidan ochilsa — parolsiz (initData + admin ekanligi tekshiriladi)
- **Buyurtmalar** — statistika (dashboard), jadval, filtr, har 30 soniyada yangilanadi; holat va to'lov holatini o'zgartirish;
  chekni ko'rish; o'chirish; **🗑 Hammasini tozalash** (`TOZALASH` deb yozib tasdiqlanadi, raqamlash #1 dan)
- **Mahsulotlar** — qo'shish/tahrirlash/o'chirish; 8 tagacha rasm (galereyadan yoki sudrab), **har rasmga rang biriktirish**
  (tayyor ranglar + qo'lda nom va #hex), rasmni kesish/joylash (ImageEditor), uz/ru matnlar, dona/optom/eski narx, razmerlar, faol/nofaol
- **Ombor** — optom komplekt qoldig'i va dona razmer qoldiqlari (ikkalasi alohida, bir-biriga ta'sir qilmaydi)
- **Storylar** — rasm, sarlavha uz/ru, mahsulotga bog'lash
- **Mijozlar** — botdan foydalanganlar ro'yxati
- **📣 Rassilka** — matn + ixtiyoriy rasm, avval **🧪 Sinov** (faqat adminlarga), jarayon ko'rinib turadi
- **⚙️ Sozlamalar** — to'lov kartasi (raqam, Uzcard/Humo, egasi), **donaga savdoni o'chirish/yoqish**

---

## 7. Biznes mantig'i (muhim qoidalar)

- **Narxlar faqat serverda hisoblanadi** — Mini App yuborgan narxga ishonilmaydi
- **Optom = komplekt:** 1 komplekt = har razmerdan 1 tadan; narx = optom narx × juftlar soni. Optom narx dona narxidan arzon bo'lsagina qo'llanadi
- **Dona:** razmer bo'yicha istalgan son, dona narxda
- Rang — faqat mahsulotda bor ranglardan; rang tanlanmasa birinchi rang
- **Ombor:** buyurtmada qoldiq ayriladi (tranzaksiyada), yetmasa — mijozga "Omborda yetarli emas: ..." xabari; bekor qilinsa qaytariladi. `null` = cheklov yo'q
- Yetkazib berish faqat ro'yxatdagi viloyatlarga
- **Kartaga o'tkazma** faqat admin karta kiritgan bo'lsa ko'rinadi. Click merchant ulanmagan bo'lsa — Click tanlansa ham kartaga o'tkazma + chek jarayoni ishlaydi
- Click merchant (`CLICK_SERVICE_ID` + `CLICK_MERCHANT_ID`) bo'lsa — `my.click.uz/services/pay` havolasi ochiladi
- Seed: bazada bor mahsulotga tegmaydi (admin o'zgarishlari saqlanadi), yangilarini qo'shadi

---

## 8. Environment (backend/.env va Render)

```
DATABASE_URL=        # Neon, "-pooler" SIZ, oxirida ?sslmode=require
BOT_TOKEN=           # BotFather
ADMIN_CHAT_IDS=      # 123456789,-1001234567890
MINIAPP_URL=         # https://______-miniapp.vercel.app
ADMIN_URL=           # https://______-admin.vercel.app
PUBLIC_URL=          # shart emas — Render RENDER_EXTERNAL_URL ni o'zi beradi
ADMIN_USERNAME=admin
ADMIN_PASSWORD=      # kuchli parol
JWT_SECRET=          # 32+ belgili tasodifiy matn
COMPANY_PHONE=
COMPANY_ADDRESS=
CLICK_SERVICE_ID=    # ixtiyoriy
CLICK_MERCHANT_ID=   # ixtiyoriy
PAYMENT_CARD= / PAYMENT_CARD_HOLDER= / PAYMENT_CARD_TYPE=   # ixtiyoriy, admin paneldan qulayroq
NODE_VERSION=20
```

Frontendlar: `VITE_API_URL=https://______.onrender.com` (`.env.production` da ham, `api.js` da `PROD_API_URL` zaxira sifatida ham).

---

## 9. Deploy

- **Render:** Root `backend`, Build: `npm install --include=dev && npx prisma db push && npm run db:seed`, Start: `npm start`,
  Health Check: `/api/health`, Region: Frankfurt. `PORT` qo'yilmaydi
- **Vercel:** ikki loyiha, Root Directory `miniapp` va `admin`; `vercel.json` — SPA rewrite, `/assets` uzoq kesh, xavfsizlik sarlavhalari, `noindex`
- `main` ga push → hammasi avtomatik yangilanadi
- BotFather: Menu Button → Mini App manzili (backend o'zi ham o'rnatadi)

---

## 10. Oldingi loyihada o'rganilgan saboqlar (qayta qilma!)

| Muammo | Yechim |
|---|---|
| Render bepul reja uxlaydi, polling bot jim qoladi | Webhook rejimi + GitHub Actions keep-alive + server o'zini ping qiladi |
| Neon `-pooler` manzilida `prisma db push` ishlamaydi | Pooling'siz manzil ishlat |
| Lokal ishga tushirilsa Render webhook'i o'chadi | Tugatgach Render → Manual Deploy |
| Render diski vaqtinchalik — admin yuklagan rasmlar yo'qoladi | Persistent Disk yoki Cloudinary; boshlang'ich rasmlar repo'da |
| Vercel build'da `localhost` qolib ketadi | `api.js` da production zaxira manzili |
| Vercel monorepo'da build yiqiladi | Har loyihada Root Directory sozla |
| Default parol kodda ochiq qoladi | Render'da ADMIN_PASSWORD va JWT_SECRET albatta almashtiriladi |
| Adminga xabarda rang ko'rinmasdi, xabar ikkiga bo'linib kelardi | Rasmga rang biriktirilmagan bo'lsa "belgilanmagan" deb chiqadi; rasm va to'liq ma'lumot bitta xabarda |
| Bot birinchi bo'lib odamga yoza olmaydi | Admin avval botga /start bosishi shart |
| Mijoz matni HTML xabarni buzadi | Hamma mijoz matni `esc()` dan o'tkaziladi |

---

## 11. Yangi loyihani boshlash tartibi (Claude uchun)

1. Anketani o'qi, bo'sh joylarni so'ra
2. Repo tuzilishini yarat (backend, miniapp, admin + .bat fayllar + README + DEPLOY)
3. `config/default.js` ga brend: nom, shior, kategoriyalar, teglar, razmerlar, ranglar, hudud
4. `schema.prisma` — mahsulot turiga moslab (razmer kerak bo'lmasa — olib tashla yoki "o'lcham" ga almashtir)
5. Bot, API, Mini App, Admin panelni shu faylda yozilgan barcha imkoniyatlar bilan yoz
6. i18n matnlarini brend va mahsulotga moslab yoz (uz + ru)
7. CSS `:root` ranglarini anketadagi ranglarga almashtir, logoni `public/logo.png` ga qo'y
8. Seed'ga namunaviy mahsulotlar (foydalanuvchi rasmlarini yuborsa — o'shalar bilan)
9. Lokal sinab ko'r (preview), keyin DEPLOY.md bo'yicha foydalanuvchiga qadam-baqadam yo'l ko'rsat
