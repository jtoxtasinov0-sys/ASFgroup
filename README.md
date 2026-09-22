# ASF GROUP — Telegram do'kon

Poyabzal ishlab chiqarish korxonasi uchun to'liq tizim: **Telegram bot + Mini App + Admin panel**.
Hammasi sizning kompyuteringizda (localhost) ishlaydi.

| Qism | Papka | Manzil |
|---|---|---|
| Backend (bot + API) | `backend/` | http://localhost:5000 |
| Mini App (mijozlar) | `miniapp/` | http://localhost:5173 |
| Admin panel | `admin/` | http://localhost:5174 |

**Kataloglar:** `Tayyor oyoq kiyim` (140 000 so'm) va `Zagatovka` (65 000 so'm) · Razmerlar 39–43
**Tillar:** o'zbek va rus · **Yetkazib berish:** faqat O'zbekiston

---

## ⚠️ 1-QADAM — Neon bazasi manzilini qo'yish

Bu yagona qolgan ish. Busiz dastur ishlamaydi.

1. https://console.neon.tech saytiga kiring
2. `dark-hill-03236904` loyihangizni oching
3. O'ng tomondagi **Connection string** bo'limidan **Copy** tugmasini bosing
4. [backend/.env](backend/.env) faylini oching (Notepad bilan ham bo'ladi)
5. `DATABASE_URL="..."` qatorini nusxalagan manzilingiz bilan almashtiring:

```
DATABASE_URL="postgresql://neondb_owner:XXXX@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

Faylni saqlang.

---

## 2-QADAM — Bazani tayyorlash

Terminalda (PowerShell) bu ikki komandani ketma-ket bajaring:

```bash
cd "C:\Users\Abdurahmon\Downloads\Telegram Desktop\ASF group\backend"; npx prisma db push
```

```bash
cd "C:\Users\Abdurahmon\Downloads\Telegram Desktop\ASF group\backend"; npm run db:seed
```

Natijada bazaga **20 ta mahsulot** (13 ta tayyor oyoq kiyim + 7 ta zagatovka) va **4 ta story** yoziladi.

> 💡 Yoki loyiha papkasidagi **`1-BAZANI-TAYYORLASH.bat`** faylini ikki marta bosing — o'zi bajaradi.

---

## 3-QADAM — Ishga tushirish

Har birini **alohida terminal oynasida** ishga tushiring (yoki `.bat` fayllarni bosing).

### Backend (bot + API) — majburiy

```bash
cd "C:\Users\Abdurahmon\Downloads\Telegram Desktop\ASF group\backend"; npm run dev
```

### Admin panel

```bash
cd "C:\Users\Abdurahmon\Downloads\Telegram Desktop\ASF group\admin"; npm run dev
```

→ Brauzerda **http://localhost:5174** ni oching
→ Login: **`admin`** · Parol: **`asf2025`**
*(o'zgartirish uchun `backend/.env` faylidagi `ADMIN_USERNAME` va `ADMIN_PASSWORD`)*

### Mini App (brauzerda sinash uchun)

```bash
cd "C:\Users\Abdurahmon\Downloads\Telegram Desktop\ASF group\miniapp"; npm run dev
```

→ **http://localhost:5173**

> Brauzerda Telegram imzosi bo'lmagani uchun dastur "Demo Mijoz" nomidan ishlaydi — bu normal.

---

## 4-QADAM — ngrok orqali Telegramga ulash

Mini App Telegram ichida ochilishi uchun **https** manzil kerak. ngrok shuni beradi.

### 4.1 — ngrok o'rnatish

1. https://ngrok.com/download saytiga kiring → **Windows** versiyasini yuklab oling
2. Arxivdan `ngrok.exe` ni chiqarib oling (masalan `C:\ngrok\` papkasiga)
3. https://dashboard.ngrok.com/get-started/your-authtoken sahifasidan **authtoken**ni nusxalang
4. Terminalda bir marta bajaring:

```bash
C:\ngrok\ngrok.exe config add-authtoken SIZNING_TOKENINGIZ
```

### 4.2 — Mini App'ni "build" qilish

Telegram uchun Mini App backend bilan birga bitta manzildan beriladi — shunda ngrok'ga faqat **1 ta port** kerak bo'ladi:

```bash
cd "C:\Users\Abdurahmon\Downloads\Telegram Desktop\ASF group\miniapp"; npm run build
```

### 4.3 — ngrok'ni ishga tushirish

Backend ishlab turgan holda, **yangi terminal** oynasida:

```bash
C:\ngrok\ngrok.exe http 5000
```

Quyidagicha manzil chiqadi:

```
Forwarding   https://a1b2-84-54-xx-xx.ngrok-free.app -> http://localhost:5000
```

`https://...` bilan boshlanadigan manzilni **nusxalang**.

### 4.4 — Manzilni .env ga yozish

[backend/.env](backend/.env) faylini oching va shu qatorni o'zgartiring:

```
MINIAPP_URL="https://a1b2-84-54-xx-xx.ngrok-free.app"
```

Saqlang va **backendni qayta ishga tushiring** (terminalda `Ctrl+C`, keyin yana `npm run dev`).

Terminalda shu yozuv chiqsa — hammasi joyida:

```
✅ Telegram Menu tugmasi ulandi: https://a1b2-...ngrok-free.app
```

### 4.5 — BotFather orqali tekshirish (ixtiyoriy, lekin tavsiya qilinadi)

1. Telegramda **@BotFather** ni oching
2. `/mybots` → botingizni tanlang → **Bot Settings** → **Menu Button** → **Configure Menu Button**
3. ngrok manzilini yuboring, keyin tugma nomini yozing: `Do'kon`

### 4.6 — Sinash

Botingizni Telegramda oching → `/start` → **🛍 Do'konni ochish** tugmasini bosing.

> ⚠️ ngrok bepul versiyasida birinchi ochilganda **"Visit Site"** degan ogohlantirish sahifasi chiqadi — bir marta bosasiz, keyin chiqmaydi.
>
> ⚠️ ngrok'ni har safar qayta ishga tushirganingizda **manzil o'zgaradi** — `.env` dagi `MINIAPP_URL` ni yangilab, backendni qayta ishga tushirish kerak.

---

## 📋 Admin panel bilan ishlash

### Buyurtmalar
Barcha buyurtmalar jadvalda: mijoz ismi, telefoni, qaysi mahsulot va qaysi razmerdan nechta olgani, manzili, jami summasi va sanasi. Har 30 soniyada avtomatik yangilanadi.
Holatni o'zgartirsangiz (Tasdiqlash / Yetkazildi / Bekor qilish) — **mijozga botdan avtomatik xabar boradi**.

### Mahsulotlar
**+ Yangi mahsulot** tugmasi orqali qo'shasiz. Rasmni **galereyadan tanlaysiz** (yoki sudrab tashlaysiz) — bitta mahsulotga 8 tagacha rasm.

### 💰 Optom narx haqida muhim eslatma
Hozir barcha mahsulotlarning optom narxi dona narxiga teng qilib qo'yilgan, shuning uchun optom chegirma **ishlamayapti**.
Ishga tushirish uchun: Mahsulotlar → **Tahrirlash** → **Optom narxi** maydoniga narx yozing (masalan `125000`) va **Optom minimumi** ni belgilang (masalan `10`).
Shundan keyin mijoz savatchasida 10 juftdan ko'p bo'lsa, narx avtomatik optomga o'tadi.

### Storylar
**+ Yangi story** tugmasi orqali istalgan paytda o'zingiz story qo'yasiz. Tik (vertikal) rasm eng chiroyli chiqadi.
Storyni mahsulotga bog'lasangiz, mijoz storyni ko'rib turib to'g'ridan-to'g'ri o'sha mahsulotga o'tadi.

### Mijozlar
Botdan foydalangan barcha mijozlar ro'yxati.

---

## 🗂 Loyiha tuzilishi

```
ASF group/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Baza jadvallari
│   │   └── seed.js                # Boshlang'ich 20 ta mahsulot
│   ├── uploads/
│   │   ├── products/              # Mahsulot rasmlari
│   │   └── stories/               # Story rasmlari
│   ├── src/
│   │   ├── config/default.js      # Sozlamalar, viloyatlar, razmerlar
│   │   ├── core/bot.js            # Bot instansiyasi
│   │   ├── database/connection.js # Prisma ulanishi
│   │   ├── models/                # User, Product, Order, Story
│   │   ├── controllers/           # bot, cart (mijoz), admin
│   │   ├── routes/                # bot, client, admin yo'llari
│   │   ├── middlewares/           # Telegram imzosi + admin JWT
│   │   └── index.js               # Ishga tushirish
│   └── .env                       # ⚠️ Maxfiy sozlamalar
│
├── miniapp/                       # Mijozlar uchun React ilova
│   └── src/
│       ├── pages/                 # Onboarding, Home, Catalog, Cart, Checkout, Profile
│       ├── components/            # Stories, ProductCard, ProductSheet, PriceTag...
│       └── lib/                   # api, telegram, i18n, store
│
└── admin/                         # Admin panel (React)
    └── src/
        ├── pages/                 # Login, Orders, Products, Stories, Users
        └── components/            # ProductForm, ImagePicker
```

---

## ❓ Muammolar

| Xato | Yechim |
|---|---|
| `Can't reach database server` | `backend/.env` dagi `DATABASE_URL` noto'g'ri yoki internet yo'q |
| `401 Unauthorized` (bot) | `BOT_TOKEN` noto'g'ri |
| `409 Conflict` (bot) | Bot ikki joyda ishlayapti — eski terminal oynasini yoping |
| Mini App'da rasm ko'rinmayapti | Backend ishlab turganini tekshiring (http://localhost:5000/api/health) |
| Telegramda tugma chiqmayapti | `MINIAPP_URL` `https://` bilan boshlanishi shart; backendni qayta ishga tushiring |
| Admin panelga kira olmayapman | Login `admin`, parol `asf2025` — `backend/.env` da yozilgan |

---

## 🔐 Maxfiylik

`backend/.env` faylida bot tokeni, baza paroli va admin paroli saqlanadi.
Bu faylni hech kimga yubormang va internetga joylamang.
