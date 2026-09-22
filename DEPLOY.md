# ASF GROUP — Deploy qo'llanmasi

## Arxitektura

| Qism | Qayerda | Manzil |
|---|---|---|
| Mini App (mijoz) | Vercel | https://asf-miniapp.vercel.app |
| Admin panel | Vercel | https://asf-admin-ten.vercel.app |
| Backend + bot | Render.com | https://asf-group-backend.onrender.com *(siz yaratasiz)* |
| Baza | Neon PostgreSQL | mavjud |

Frontend'lar allaqachon Vercel'da va `VITE_API_URL` backend manziliga yo'naltirilgan.
Backendni Render'ga qo'yishingiz bilan hammasi ulanadi.

---

---

## 0-QISM: Vercel'da bitta sozlama (2 daqiqa)

Ikkala ilova ham Vercel'da ishlab turibdi, lekin **avtomatik qayta deploy**
ishlashi uchun har bir loyihada `Root Directory` ni ko'rsatish kerak. Sababi —
repo'da uchta papka bor (`miniapp`, `admin`, `backend`), Vercel esa qaysi birini
build qilishni bilmaydi.

**asf-miniapp uchun:**

1. https://vercel.com/dashboard → **asf-miniapp** loyihasini oching
2. **Settings** → **Build and Deployment**
3. **Root Directory** bo'limida **Edit** → `miniapp` deb yozing → **Save**

**asf-admin uchun:**

1. Dashboard → **asf-admin** → **Settings** → **Build and Deployment**
2. **Root Directory** → **Edit** → `admin` deb yozing → **Save**

Shundan keyin **Deployments** → eng yuqoridagi deploy → `...` → **Redeploy**
qilib tekshiring. Build muvaffaqiyatli o'tishi kerak.

> Bu sozlama qo'yilmaguncha `git push` qilganda Vercel build'i xato beradi,
> lekin jonli saytlar ishlashda davom etadi (oxirgi muvaffaqiyatli deploy
> saqlanib turadi).

## 1-QISM: Render.com'ga backend joylash

### 1-qadam — Render'ga kirish

1. https://render.com ga o'ting
2. **Get Started** → **GitHub** bilan kiring (jtoxtasinov0-sys hisobi)
3. Render GitHub'ga ruxsat so'raydi — `ASFgroup` repo'siga ruxsat bering

### 2-qadam — Yangi Web Service

1. Dashboard'da **New +** → **Web Service**
2. **Build and deploy from a Git repository** → **Next**
3. Ro'yxatdan `jtoxtasinov0-sys/ASFgroup` ni toping → **Connect**

### 3-qadam — Sozlamalar

Quyidagilarni **aynan shunday** to'ldiring:

| Maydon | Qiymat |
|---|---|
| **Name** | `asf-group-backend` ⚠️ **aynan shu nom** |
| **Region** | `Frankfurt (EU Central)` |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Language / Runtime** | `Node` |
| **Build Command** | `npm install --include=dev && npx prisma db push` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` yoki `Starter` (pastdagi ogohlantirishni o'qing) |

> ⚠️ **Nom nega muhim?** Render manzili nomdan yasaladi:
> `asf-group-backend` → `https://asf-group-backend.onrender.com`
> Vercel'dagi ikkala ilova aynan shu manzilga murojaat qiladi. Agar boshqa nom
> tanlasangiz, 3-QISM dagi qadamlarni bajarishingiz kerak bo'ladi.

### 4-qadam — Environment Variables

Sahifani pastga aylantirib **Environment Variables** bo'limini toping.
**Add Environment Variable** tugmasi bilan quyidagilarni birma-bir qo'shing:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon connection string — `backend/.env` faylingizdan nusxalang |
| `BOT_TOKEN` | BotFather bergan token — `backend/.env` dan nusxalang |
| `MINIAPP_URL` | `https://asf-miniapp.vercel.app` |
| `PUBLIC_URL` | `https://asf-group-backend.onrender.com` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | 🔴 **YANGI kuchli parol** — `asf2025` EMAS! |
| `JWT_SECRET` | 🔴 **YANGI uzun tasodifiy matn** (kamida 32 belgi) |
| `COMPANY_PHONE` | `+998 90 123 45 67` (o'zingiznikini yozing) |
| `COMPANY_ADDRESS` | `Toshkent sh.` |
| `NODE_VERSION` | `20` |

> 🔴 **`ADMIN_PASSWORD` ni albatta almashtiring.** Eski `asf2025` parol
> `backend/src/config/default.js` ichida default qiymat sifatida yozilgan va
> GitHub repo'si ochiq — ya'ni uni har kim ko'ra oladi.
>
> `JWT_SECRET` uchun tasodifiy matn olish (PowerShell'da):
> ```
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

> ❗ **`PORT` ni QO'SHMANG.** Uni Render o'zi beradi, kod uni avtomatik oladi.

### 5-qadam — Health Check

**Advanced** bo'limini oching → **Health Check Path** maydoniga:

```
/api/health
```

### 6-qadam — Deploy

**Create Web Service** tugmasini bosing. Birinchi build 3–6 daqiqa davom etadi.

Loglarda quyidagilarni ko'rishingiz kerak:

```
ASF GROUP  —  SIFAT VA ISHONCH
✅ Server: http://localhost:10000
✅ Telegram Menu tugmasi ulandi: https://asf-miniapp.vercel.app
```

---

## 2-QISM: Tekshirish

### Backend ishlayaptimi?

Brauzerda oching:
```
https://asf-group-backend.onrender.com/api/health
```
Javob: `{"ok":true,"name":"ASF GROUP API","slogan":"SIFAT VA ISHONCH"}`

### Baza to'ldirilganmi?

Agar mahsulotlar ko'rinmasa, bazani to'ldiring. Buni **o'z kompyuteringizdan**
qilish mumkin, chunki `backend/.env` dagi `DATABASE_URL` xuddi shu Neon bazasiga
ulanadi:

```
cd backend
npm run db:seed
```

### Admin panel

1. https://asf-admin-ten.vercel.app ni oching
2. `admin` + Render'da qo'ygan **yangi parolingiz** bilan kiring

### Mini App

1. Telegram'da botingizni oching
2. Pastdagi **Do'kon** tugmasini bosing
3. Katalog ochilishi kerak

---

## 3-QISM: Agar Render boshqa manzil bergan bo'lsa

Agar `asf-group-backend` nomi band bo'lib, Render sizga boshqa manzil bergan
bo'lsa (masalan `asf-group-backend-x7k2.onrender.com`), ikkala Vercel loyihasida
manzilni yangilang:

1. https://vercel.com/dashboard → **asf-miniapp** → **Settings** → **Environment Variables**
2. `VITE_API_URL` ni toping → **Edit** → yangi Render manzilini yozing → **Save**
3. **Deployments** bo'limiga o'ting → eng yuqoridagi deploy → `...` → **Redeploy**
4. Xuddi shuni **asf-admin** loyihasi uchun ham takrorlang

Shuningdek repo'dagi ikkala faylni yangilang va push qiling:
`miniapp/.env.production` va `admin/.env.production`

---

## 4-QISM: Telegram bot sozlamalari

Menu tugmasi backend ishga tushganda avtomatik o'rnatiladi. Qo'shimcha sozlash
uchun BotFather'da:

1. `/mybots` → botingizni tanlang
2. **Bot Settings** → **Menu Button** → **Edit menu button URL**
3. `https://asf-miniapp.vercel.app` ni kiriting

---

## ⚠️ Bilib qo'yish kerak bo'lgan ikki cheklov

### 1. Free tier uxlab qoladi

Render'ning bepul rejasida servis **15 daqiqa harakatsizlikdan keyin o'chadi**:

- Telegram bot `polling` rejimida ishlaydi — servis uxlaganda **bot javob bermaydi**
- Birinchi so'rov servisni uyg'otadi, bu **~50 soniya** kutish demak
- Bepul rejada oyiga 750 soat limit bor

**Yechim variantlari:**

| Variant | Narx | Izoh |
|---|---|---|
| **Starter reja** | $7/oy | Eng oddiy yo'l — servis hech qachon uxlamaydi |
| Bot'ni webhook rejasiga o'tkazish | bepul | Kodni o'zgartirish kerak, lekin uyqu muammosi baribir qoladi |
| Tashqi ping xizmati | bepul | 750 soat limitini tez tugatadi |

Haqiqiy do'kon uchun **Starter rejani tavsiya qilaman**.

### 2. Yuklangan rasmlar yo'qoladi

Admin paneldan yuklangan rasmlar Render diskiga (`backend/uploads/`) saqlanadi,
lekin Render'da disk **vaqtinchalik** — har deploy yoki qayta ishga tushishda
o'chib ketadi.

- Repo'dagi mavjud rasmlar (`uploads/products/*.jpg`) **saqlanadi** — ular kod bilan birga keladi
- Admin paneldan **yangi yuklangan** rasmlar (`custom-*`) **yo'qoladi**

**Yechim variantlari:**

| Variant | Narx | Izoh |
|---|---|---|
| Render Persistent Disk | $0.25/GB/oy (Starter kerak) | Eng oddiy — `/opt/render/project/src/uploads` ga mount qilinadi |
| Cloudinary | bepul reja bor | Kodni o'zgartirish kerak, lekin tezroq va ishonchliroq |
| Rasmlarni repo'ga qo'yish | bepul | Faqat kam o'zgaradigan rasmlar uchun |

---

## Keyingi deploy'lar

Repo'ga push qilsangiz hammasi avtomatik yangilanadi:

```
git add -A
git commit -m "o'zgarishlar"
git push
```

- Vercel → `miniapp` va `admin` ni qayta build qiladi *(0-QISM dagi Root Directory sozlangandan keyin)*
- Render → `backend` ni qayta build qiladi
