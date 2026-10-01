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
| Asosiy rang (urg'u) | `#______` (ASF da: logodagi to'q ko'k `#0b2257` → gradient `#163a85` → `#2c5fd0`) |
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
    ├── middlewares/auth.middleware.js  # Telegram initData HMAC tekshiruvi + brauzer veb-tokeni + admin JWT
    ├── services/payment.js    # karta, chek, Tasdiqlash/Rad etish
    ├── services/stock.js      # ombor: buyurtmada ayirish / bekor qilinsa qaytarish (tranzaksiyada)
    ├── utils/i18n.js          # bot matnlari (uz/ru), adminga xabar shablonlari
    ├── utils/colors.js        # rang kalitlari va qo'lda kiritilgan ranglar
    ├── utils/upload.js        # multer, fayl yo'llari, siqish, bazada zaxira, kichik nusxalar (?w=)
    └── index.js               # Express, /uploads statik, /api/health, webhook yo'li, o'zini ping qilish
```

### Mini App tuzilishi

```
miniapp/src/
├── pages/      Onboarding, ModeSelect, Home, Catalog, Cart, Checkout, Profile
├── components/ BottomNav, ProductCard, ProductSheet, SheetClose, PriceTag, PhotoViewer, Stories, StoryViewer, PaymentScreen,
│               Icon (SVG ikonkalar), ModeCards (Optom/Donaga rasmli kartalar), OfferCarousel ("Maxsus taklif" bannerlari)
├── lib/        api (qayta urinish bilan), telegram (WebApp, haptic), i18n (uz/ru), store (savatcha), stock, colors, frame, image, format,
│               fly (savatga uchish animatsiyasi, savatcha sakrashi, "Savatchaga qo'shildi" xabari)
└── public/     logo.png, pair.jpg (1 juft — mahsulot rasmi bo'lmasa zaxira), ikonkalar, manifest
```

### Admin panel tuzilishi

```
admin/src/
├── pages/      Login, Orders, Products, Stock, Stories, Users, Broadcast, Settings
├── components/ ProductForm, ImagePicker, ImageEditor (rasmni kesish/joylash),
│               Icon (SVG ikonkalar), InstallHint (ekranga qo'shish ko'rsatmasi)
└── lib/        api, colors, frame, install (ekranga qo'shish — Mini App'dagi bilan bir xil)
admin/public/   logo.png, manifest.webmanifest, apple-touch-icon.png, icon-192.png, icon-512.png ("ASF ADMIN" belgisi)
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
- **ModeSelect** — kirganda "Ulgurji (optom)" yoki "Donaga" tanlash (**rasmli kartalar**, 5.3 ga qara);
  keyin istalgan payt bosh sahifadagi shu kartalar bilan almashtiriladi.
  Admin donaga savdoni o'chirsa — faqat optom ko'rinadi
- **Home** — "Salom, **Ism**" (ism gradient rangda) + shior, Stories doiralari, Optom/Donaga kartalari,
  aylanuvchi **"Maxsus taklif"** bannerlari, rasmli **Bo'limlar** ("14 ta model"), chegirmalar, ommabop modellar
- **Catalog** — kategoriya, teg filtrlari, qidiruv, mahsulot kartalari (narx, eski narx, "tugagan", qoldiq)
- **ProductSheet** (pastdan chiqadigan oyna) — rasmlar karuseli, **rang tanlash** (rasm rangiga qarab), to'liq ekran PhotoViewer,
  optomda — komplekt soni (+/−), donada — razmer bo'yicha juft soni; ombor qoldig'i; "optomda N so'm arzon" maslahati
- **Cart** — optom va dona bo'limlari alohida, narxlar **serverda qayta hisoblanadi** (`/api/cart/calculate`)
- **Checkout** — ism, telefon, viloyat (ro'yxatdan), manzil, izoh, to'lov usuli: Naqd / Click / Kartaga o'tkazma
  - **Qayta buyurtmada avto-to'ldirish:** oyna ochilganda `GET /orders/my` dan oxirgi buyurtma olinadi va ism,
    telefon, viloyat (joriy tilga o'girilgan), manzil o'zi qo'yiladi. Mijoz yozib ulgurgan maydonga tegilmaydi.
    Bazadan olinadi — telefon almashsa ham saqlanadi (localStorage emas)
  - **To'ldirilmagan maydon qizil:** majburiy maydon (ism, telefon, viloyat, manzil) bo'sh bo'lsa — qizil ramka
    va ostida "To'ldiring" / "Заполните это поле"; telefon chala bo'lsa — "Telefon raqamni to'liq kiriting".
    Tasdiqlash tugmasi kulrang qotib turmaydi: bosilsa birinchi qizil maydonga scroll qilib, fokus beradi
- **PaymentScreen** — karta raqami (nusxalash), summa, chek rasmini yuklash
- **Profile** — ma'lumotlar, til, **Mening buyurtmalarim** (holat, to'lov holati, "qayta buyurtma"), kompaniya bilan bog'lanish
- **BottomNav** — suzib turuvchi oq "tabletka": Asosiy, Katalog, **o'rtada katta yumaloq savatcha tugmasi** (soni bilan),
  Qidiruv (katalogni ochib, qidiruv maydoniga kursor qo'yadi), Profil. Bo'lim almashganda sahifa tepaga qaytadi
- **Stories / StoryViewer** — 5.4 ga qara
- Telegram haptic, xavfsiz zona (safe-area), server uxlab qolsa — 3 marta qayta urinish va "Server uyg'onmoqda..." yozuvi
- Brauzerda (Telegram tashqarisida, production emas) — "Demo Mijoz" nomidan ishlaydi

### 5.1 Brauzerdan / telefon ekranidan ishlash (Telegramsiz)

Mijoz saytni Chrome/Safari'da ochib, **"На экран «Домой»"** qilib oddiy ilova kabi ishlatishi mumkin. Bu to'liq ishlaydi:

- **Buyurtma berish (veb-token):** Telegram imzosi (`initData`) bo'lmasa, Mini App `POST /api/web/session` dan
  imzolangan JWT oladi (`role: 'web'`, `sub: "web_<tasodifiy hex>"`, 10 yil) va `localStorage` ga saqlaydi.
  Himoyalangan so'rovlarga `X-Web-Token` sarlavhasi bilan yuboriladi; `telegramAuth` uni ham qabul qiladi
  (`req.isWeb = true`). Katalog/story/config so'rovlari tokenni kutmaydi. Token eskirsa (401) — yangisi olinadi.
  User jadvaliga `telegramId = "web_..."` bo'lib yoziladi; birinchi buyurtmadagi ism `firstName` ga qo'yiladi
- **Bot xabarlari:** `safeSend` faqat raqamli chat ID ga yuboradi — `web_...` mijozga urinmaydi. Rassilka ham ularni
  o'tkazib yuboradi. Admin xabarida Telegram havolasi o'rniga "🌐 Saytdan (Telegramsiz) — telefon orqali bog'laning"
- **Matnlar:** brauzerda "botda xabar olasiz" o'rniga "«Buyurtmalarim» bo'limida ko'rasiz" (`receiptSentWeb`,
  `payLaterHintWeb`); buyurtmadan keyin ilova yopilmaydi — **"Bosh sahifaga"** tugmasi chiqadi
- **Orqaga tugmasi:** Telegramda tepada o'zining BackButton'i bor, brauzerda yo'q. Shuning uchun `SheetClose`
  komponenti — pastdan chiqadigan oynalar (ProductSheet, Checkout) chap tepasida yumaloq **‹** tugma
  (faqat `!isTelegram` da ko'rinadi; Checkout sarlavhasi `sheet-title` bilan surilib turadi)
- **Ekrandagi belgi (ikonka):** `public/apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png` — logodan
  kvadrat qilib kesilgan, fon logoning foni bilan bir xil; `public/manifest.webmanifest` (`display: standalone`,
  nom, ranglar) va `index.html` da `apple-touch-icon`, `manifest`, `apple-mobile-web-app-title/capable` teglari.
  Eslatma: iPhone belgini qo'shilgan paytda saqlaydi — eski belgini o'chirib, qayta qo'shish kerak

### 5.2 Rasmlar tez ochilishi

- **Kichik nusxalar (thumbnail):** backend `GET /uploads/...?w=480` — `sharp` bilan WebP (160/320/480/800 px),
  `uploads/_thumbs/` da keshlanadi (git'dan chetlatilgan). 322 KB → 45 KB. Mini App'da `imageUrl(path, width)`:
  kartochka 480, story/savatcha 320, buyurtmalar 160; mahsulot oynasi va to'liq ekran — asl rasm
- **Server uyg'onishini kutish:** `retryImage` ~1 daqiqa (1.5–25 s oraliq) qayta so'raydi; katalog serverdan
  yangilanganda va ilova fondan qaytganda (`visibilitychange`) `reloadBrokenImages()` buzilgan rasmlarni darhol qayta yuklaydi
- Yuklashda siqish (max 1600px), `custom-*` rasmlar 1 yil keshlanadi, rasmlar bazada (`StoredFile`) zaxiralanadi

### 5.3 Dizayn tizimi va animatsiyalar ("wow" ko'rinish)

Uslub — zamonaviy yetkazib berish ilovalari (Uber/Yandex Go) dizayni, lekin **brend logosi ranglarida**:

- **Ranglar** (`index.css` oxiridagi "YANGI DIZAYN" bloki, `:root`):
  `--navy` (logo rangi), `--navy-700`, `--blue`, `--navy-50` (och fon), `--grad` (navy → blue 135° gradient),
  `--ink`, `--muted`, `--line`, `--bg` (`#f3f6fc` — havorang-oq), `--red` (faqat chegirma/tugagan), `--green` (qo'shildi ✓).
  **Yangi brendda faqat shu o'zgaruvchilarni almashtirish kifoya** — hamma tugma, banner, halqa, soya shulardan oladi.
  Telegram sarlavha/fon rangi (`telegram.js`), `theme-color` (`index.html`) va `manifest.webmanifest` ham brend rangiga
- **Fon:** ikki yumshoq radial gradient + yuqori o'ng burchakda brend gradientidagi "to'lqin" shakli (`.bg-blob`,
  sekin aylanib-kattalashib turadi) — namunadagi qizil burchak shaklining analogi
- **Kartochkalar:** oq, burchak 22–26px, ko'kimtir yumshoq soya (`--shadow-card`), chegarasiz; bosilganda 0.96 ga
  "prujina" bilan kichrayadi (`--ease-spring`)
- **Shrift:** Manrope (Google Fonts, 500–800), sarlavhalar 800, harflar oralig'i −0.02…−0.03em
- **Ikonkalar:** emoji emas — `Icon.jsx` dagi chiziqli SVG (home, grid, bag, user, plus, check, arrow, search, box, swap)
- **Optom / Donaga kartalari** (`ModeCards.jsx`): ikkita yonma-yon karta (kirish ekranida — katta, ustma-ust).
  Optomda — katalogdagi 3 ta mahsulot rasmi yelpig'ichdek + "Komplekt" yorlig'i + "×5" (razmerlar soni);
  Donaga — **bitta juft** oyoq kiyim rasmi + "1 juft" yorlig'i. Tanlangani gradient fonga o'tadi, rasmlar yoyiladi,
  strelka 45° buriladi. Rasm bo'lmasa — `public/pair.jpg`
- **"Maxsus taklif" bannerlari** (`OfferCarousel.jsx`): gradient karta, chapda yorliq + 2 qatorli sarlavha + matn +
  oq "Katalogni ochish →" tugmasi, o'ngda **suzib turuvchi** qiya mahsulot rasmi va aylanib turuvchi punktir halqa.
  Slaydlar: savdo turiga mos taklif, chegirma bo'lsa "−N% gacha", "Yangi kolleksiya". Har 4.5 s o'zi aylanadi
  (mijoz surishni boshlasa — to'xtaydi), pastda nuqtalar (faoli cho'zilgan)
- **Paydo bo'lish:** sarlavha, kartalar, banner `rise` (pastdan ko'tarilib), mahsulot kartochkalari ketma-ket
  45 ms kechikish bilan; story doirachalari `popIn`
- **Savatga qo'shish animatsiyasi** (`lib/fly.js`) — eng muhim "wow" joy:
  1. "+" bosilganda tugma burilib-sakraydi (`addPop`) va atrofidan yashil to'lqin tarqaladi, keyin yashil "✓" bo'ladi
  2. Mahsulot rasmining nusxasi yoy bo'ylab (avval yuqoriga, keyin pastga, aylanib-kichrayib) pastki savatcha
     tugmasiga **uchadi** (Web Animations API, 780 ms). Nishon — `[data-cart-target]` atributli element
  3. Yetib kelganda savatcha tugmasi silkinadi (`cartBump`), atrofga 8 ta ko'k **uchqun** sochiladi, qizil son
     "otilib" yangilanadi
  4. Pastda qora "✓ Savatchaga qo'shildi" xabari chiqib, 1.8 s da yo'qoladi
  - Mahsulot oynasidan (ProductSheet) qo'shganda ham — ko'rinib turgan rasm uchadi (oyna yopilsa ham nusxa qoladi)
  - `quickAdd` savatga haqiqatan qo'shsagina `true` qaytaradi — oyna ochilgan holatda (tugagan, allaqachon savatda) uchmaydi
- **Tugmalar:** gradient, burchak 18px, rangli soya; bosilganda 0.97. Narx yorlig'i — och ko'k "tabletka"
  (chegirmada — och qizil)
- **`prefers-reduced-motion`** yoqilgan telefonlarda hamma animatsiya o'chadi (uchish o'rniga faqat sakrash + xabar),
  **story vaqt chizig'i bundan mustasno** (aks holda storylar darhol o'tib ketadi)

### 5.4 Storylar (Instagram uslubida)

- **Doirachalar:** 74px, ko'rilmaganlarida brend gradientidagi **aylanib turuvchi halqa** va yengil nur;
  ko'rilganlari kulrang. Ketma-ket "otilib" chiqadi, bosilganda kichrayadi. Ko'rilganlar `localStorage` da
- **Ko'ruvchi (StoryViewer):**
  - Ochilish — markazdan kattalashib (`storyOpen`); har story almashganda rasm yumshoq paydo bo'lib, sekin
    kattalashadi (Ken Burns); ekranga sig'masa — orqada o'sha rasmning xiralashtirilgan nusxasi
  - Tepada vaqt chiziqlari (5 s); **chiziq animatsiyasi tugashi = keyingi story** (`onAnimationEnd`) —
    shuning uchun pauza aniq ishlaydi
  - **Bosib turish — pauza** (chiziq va rasm to'xtaydi, matnlar xiralashadi); qo'yib yuborish "keyingisi" deb sanalmaydi
  - Chap 35% — oldingi, o'ng 35% — keyingi; **pastga surish — yopish** (ekran surilib-kichrayadi)
  - Tepada logo + "ASF GROUP" + shior, shisha effektli × tugma
  - Storyga mahsulot bog'langan bo'lsa — pastda shisha (blur) kartochka: mahsulot rasmi, nomi, narxi va
    "turtib" turuvchi oq → tugma; bosilsa mahsulot oynasi ochiladi. Bog'lanmagan bo'lsa — katta sarlavha
  - Keyingi story rasmi oldindan yuklanadi

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

### 6.1 Admin panel dizayni (Mini App bilan bir xil uslub)

- Xuddi Mini App'dagi ranglar va shrift: `styles.css` oxiridagi "YANGI DIZAYN" bloki, `:root` da `--navy`, `--blue`,
  `--grad`, `--bg`, `--shadow` va h.k. — **yangi brendda ikkala ilovada bir xil qiymat qo'yiladi**. Manrope shrifti
- **Kirish sahifasi:** havorang fon, ikki burchakda sekin aylanuvchi brend gradientidagi "to'lqin" shakllari,
  o'rtada shisha (blur) kartochka, logo "otilib" chiqadi, sarlavha "ASF ADMIN"
- **Yon menyu (kompyuter):** chetdan ajralgan, burchaklari 28px gradient panel, pastida yorug' doira bezagi;
  emoji o'rniga SVG ikonkalar; faol bo'lim — oq "tabletka"; yangi buyurtmalar soni qizil, sekin "urib" turadi;
  pastda "Ekranga qo'shish" (punktir) va "Chiqish"
- **Telefon (≤860px):** menyu tepada yopishib turuvchi gradient panelga aylanadi — logo + "ASF ADMIN",
  "Ekranga qo'shish", chiqish belgisi, ostida surib ko'riladigan bo'lim "tabletkalari"
- **Statistika:** oq kartochkalar ketma-ket paydo bo'ladi, sichqoncha olib borilsa ko'tariladi;
  **"Umumiy summa" — gradient kartochka** (telefonda to'liq enida)
- Jadval, filtr "chip"lari, tugmalar (gradient, prujinali bosilish), modal oynalar (xira fon + "sakrab" ochilish,
  × tugmasi aylanadi) — hammasi Mini App uslubida. Har bo'lim ochilganda yumshoq ko'tarilib paydo bo'ladi
- Telegram ichida ochilganda sarlavha/fon rangi `#F3F6FC`

### 6.2 Admin panelni ekranga qo'shish (ilova kabi)

- `admin/public/manifest.webmanifest`: nom "ASF GROUP — Admin", qisqa nom **"ASF Admin"**, `display: standalone`
- **Belgi:** Mini App ikonkasi asosida, lekin "ASF GROUP" yozuvi o'rniga ko'k yumaloq shakl ichida
  **"ASF ADMIN"** — telefon ekranida do'kon ilovasidan ajralib turadi. ImageMagick bilan yasaldi:
  logo ostidagi yozuvlar fon rangi bilan bo'yaladi, ustiga `--blue` rangli yumaloq to'rtburchak va oq "ASF ADMIN" matni
  (512 → 192 va 180 px). `index.html` da `apple-touch-icon`, `manifest`, `apple-mobile-web-app-title = ASF Admin`
- **InstallHint** kartochkasi (sahifa tepasida, yopsa qayta chiqmaydi): Chrome/Edge'da — "Ekranga qo'shish"
  tugmasi brauzerning o'z oynasini ochadi; Android'da va iPhone Safari'da — qadam-baqadam ko'rsatma;
  iPhone'dagi boshqa brauzerda — "Safari'da oching". Yon menyudagi **"Ekranga qo'shish"** tugmasi yopilgan
  ko'rsatmani ham qayta chiqaradi. Telegram ichida va allaqachon o'rnatilgan bo'lsa — ko'rinmaydi
- Mini App bilan aralashmasligi uchun "yopildi" belgisi alohida kalitda (`asf_admin_install_hint_closed`)

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
| Ekranga qo'shilgan saytda (Chrome/Safari) buyurtma tugmasi o'chiq edi | Veb-token (5.1 bo'lim) — Telegramsiz ham buyurtma |
| Ekrandagi belgi "A" harfi bo'lib chiqardi | `apple-touch-icon.png` + `manifest.webmanifest` boshidanoq qo'yilsin |
| Brauzerda mahsulot oynasidan chiqib bo'lmasdi | `SheetClose` "‹" tugmasi (Telegramda BackButton bor, brauzerda yo'q) |
| Server uxlaganda rasmlar "?" bo'lib qolardi, katta rasmlar sekin | Thumbnail `?w=` + uzoq qayta urinish + `reloadBrokenImages` |
| Rangli mahsulot savatga qo'shilsa ham kartada "+" qolib ketardi | "Savatda" tekshiruvi ham rang bilan: `cartKey(mode, id, effectiveColor(product, null))` |
| Pastki menyuda uzun nom ("Bosh sahifa") ikki qatorga tushardi | Qisqa nom ("Asosiy") + `white-space: nowrap; text-overflow: ellipsis` |
| "Animatsiyani kamaytirish" yoqilgan telefonda storylar bir zumda o'tib ketishi mumkin | Story chizig'iga `animation-duration` ni `!important` bilan qaytarish |
| Admin va do'kon ekranda bir xil belgi bilan chiqib, adashtirardi | Admin belgisida "ASF ADMIN" yozuvi, qisqa nom "ASF Admin" |

---

## 11. Yangi loyihani boshlash tartibi (Claude uchun)

1. Anketani o'qi, bo'sh joylarni so'ra
2. Repo tuzilishini yarat (backend, miniapp, admin + .bat fayllar + README + DEPLOY)
3. `config/default.js` ga brend: nom, shior, kategoriyalar, teglar, razmerlar, ranglar, hudud
4. `schema.prisma` — mahsulot turiga moslab (razmer kerak bo'lmasa — olib tashla yoki "o'lcham" ga almashtir)
5. Bot, API, Mini App, Admin panelni shu faylda yozilgan barcha imkoniyatlar bilan yoz
6. i18n matnlarini brend va mahsulotga moslab yoz (uz + ru)
7. CSS `:root` ranglarini (`--navy`, `--navy-700`, `--blue`, `--navy-50`, `--grad`, `--bg`) anketadagi ranglarga
   almashtir — 5.3 dagi dizayn va animatsiyalarning **hammasi** saqlanib qolsin (uchish, bannerlar, rasmli
   Optom/Donaga kartalari, suzuvchi menyu, storylar). Mahsulot birligiga moslab yorliqlarni o'zgartir
   ("1 juft" → "1 dona", "Komplekt" → "Quti" va h.k.). Admin panelga ham xuddi shu ranglar (6.1) va
   ekranga qo'shish (6.2, "<BREND> ADMIN" belgisi bilan). Logoni `public/logo.png` ga qo'y;
   logodan `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` yasab, `manifest.webmanifest` ni brendga moslab yoz
8. Seed'ga namunaviy mahsulotlar (foydalanuvchi rasmlarini yuborsa — o'shalar bilan)
9. Lokal sinab ko'r (preview), keyin DEPLOY.md bo'yicha foydalanuvchiga qadam-baqadam yo'l ko'rsat
