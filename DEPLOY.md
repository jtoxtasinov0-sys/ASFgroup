# ASF GROUP — Deploy qo'llanmasi

## Arxitektura

| Qism | Qayerda | Manzil |
|---|---|---|
| Mini App (mijoz) | Vercel | https://asf-miniapp.vercel.app |
| Admin panel | Vercel | https://asf-admin-ten.vercel.app |
| Backend + bot | Render.com | https://asfgroup.onrender.com *(siz yaratasiz)* |
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
| **Name** | `asfgroup` ⚠️ **aynan shu nom** |
| **Region** | `Frankfurt (EU Central)` |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Language / Runtime** | `Node` |
| **Build Command** | `npm install --include=dev && npx prisma db push && npm run db:seed` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` yoki `Starter` (pastdagi ogohlantirishni o'qing) |

> ⚠️ **Nom nega muhim?** Render manzili nomdan yasaladi:
> `asfgroup` → `https://asfgroup.onrender.com`
> Vercel'dagi ikkala ilova va botning webhook'i aynan shu manzilga bog'lanadi.
> Agar boshqa nom tanlasangiz, 3-QISM dagi qadamlarni bajarishingiz kerak.

### 4-qadam — Environment Variables

Sahifani pastga aylantirib **Environment Variables** bo'limini toping.
**Add Environment Variable** tugmasi bilan quyidagilarni birma-bir qo'shing:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon console'dan olinadi — pastdagi izohga qarang |
| `BOT_TOKEN` | BotFather bergan token — `backend/.env` dan nusxalang |
| `MINIAPP_URL` | `https://asf-miniapp.vercel.app` |
| `PUBLIC_URL` | *shart emas* — Render manzilini o'zi beradi (`RENDER_EXTERNAL_URL`) |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | 🔴 **YANGI kuchli parol** — `asf2025` EMAS! |
| `JWT_SECRET` | 🔴 **YANGI uzun tasodifiy matn** (kamida 32 belgi) |
| `COMPANY_PHONE` | `+998 90 123 45 67` (o'zingiznikini yozing) |
| `COMPANY_ADDRESS` | `Toshkent sh.` |
| `NODE_VERSION` | `20` |
| `ADMIN_CHAT_IDS` | yangi buyurtma xabari boradigan chat ID'lar — 4-QISM ga qarang |
| `ADMIN_URL` | *shart emas* — admin panel manzili, standart: `https://asf-admin-ten.vercel.app` |

> 📌 **`DATABASE_URL` ni qayerdan olish kerak:**
>
> 1. https://console.neon.tech/app/projects/dark-hill-03236904 ni oching
> 2. Dashboard'dagi **Connection string** oynasini toping
> 3. ⚠️ **Connection pooling** belgisini **olib tashlang** — manzilda `-pooler`
>    so'zi **bo'lmasligi** kerak. Aks holda build paytidagi `prisma db push`
>    ishlamaydi.
> 4. Butun qatorni nusxalang — u shunday ko'rinadi:
>    `postgresql://neondb_owner:npg_xxxx@ep-xxxx-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require`
> 5. Xuddi shu qatorni kompyuteringizdagi `backend/.env` fayliga ham yozing —
>    shunda bazani to'ldirish (`npm run db:seed`) ishlaydi.
>
> ❌ `.env.example` dagi `postgresql://USER:PASSWORD@HOST.neon.tech/...` qatorini
> nusxalamang — bu shunchaki namuna matn, haqiqiy manzil emas.

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
https://asfgroup.onrender.com/api/health
```
Javob: `{"ok":true,"name":"ASF GROUP API","slogan":"SIFAT VA ISHONCH"}`

### Baza to'ldirilganmi?

Build Command'da `npm run db:seed` bo'lsa, mahsulotlar har deploy'da avtomatik
tekshiriladi va **yangilari o'zi qo'shiladi**. Bazada bor mahsulotlar tegilmaydi —
Admin paneldagi narx va nom o'zgarishlaringiz saqlanib qoladi.

Kompyuteringizdan ishga tushirish ham mumkin (`backend/.env` xuddi shu Neon
bazasiga ulanadi):

```
cd backend
npm run db:seed
```

Barcha mahsulotlarni boshlang'ich holatga **qaytarish** kerak bo'lsa (Admin
paneldagi o'zgarishlar yo'qoladi):

```
SEED_FORCE=1 npm run db:seed
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

Render manzilini servis sahifasining yuqorisidan nusxalab oling. Agar u
`https://asfgroup.onrender.com` dan farq qilsa, **to'rt joyni** yangilash kerak —
biri qolib ketsa ilova ulanmaydi:

**1. Render → Environment**

Odatda hech narsa qilish shart emas: Render o'z manzilini `RENDER_EXTERNAL_URL`
orqali beradi va bot o'shani ishlatadi. Agar `PUBLIC_URL` qo'lda yozilgan bo'lsa
va Render manzilidan farq qilsa, logda ogohlantirish chiqadi — o'shani
o'chirib qo'yganingiz ma'qul.

**2–3. Vercel (ikkala loyihada)**

1. https://vercel.com/dashboard → **asf-miniapp** → **Settings** → **Environment Variables**
2. `VITE_API_URL` ni toping → **Edit** → yangi manzilni yozing → **Save**
   (Type: **Config**, Secret emas — `VITE_` prefiksi baribir brauzerga chiqadi)
3. **Deployments** → eng yuqoridagi deploy → `⋯` → **Redeploy** (kesh belgisisiz)
4. Xuddi shuni **asf-admin** loyihasi uchun ham takrorlang

**4. Repo (zaxira manzil)**

Bu fayllarda manzil yozilgan, ularni ham yangilang va push qiling:

| Fayl | Nima uchun |
|---|---|
| `miniapp/.env.production` | build paytidagi manzil |
| `admin/.env.production` | build paytidagi manzil |
| `miniapp/src/lib/api.js` → `PROD_API_URL` | `VITE_API_URL` ishlamasa ishlatiladigan zaxira |
| `admin/src/lib/api.js` → `PROD_API_URL` | xuddi shunday |

---

## 4-QISM: Telegram bot sozlamalari

Menu tugmasi backend ishga tushganda avtomatik o'rnatiladi. Qo'shimcha sozlash
uchun BotFather'da:

1. `/mybots` → botingizni tanlang
2. **Bot Settings** → **Menu Button** → **Edit menu button URL**
3. `https://asf-miniapp.vercel.app` ni kiriting

### Yangi buyurtma haqida xabar olish

Mijoz buyurtma bersa, bot `ADMIN_CHAT_IDS` da yozilgan har bir chatga
buyurtma tafsilotlarini (mahsulotlar, razmerlar, summa, mijoz telefoni,
manzil) yuboradi.

1. Xabar oladigan odam botga **/start**, keyin **/id** deb yozadi —
   bot uning Chat ID raqamini ko'rsatadi (masalan `123456789`)
2. Render → **Environment** → `ADMIN_CHAT_IDS` = shu raqam → **Save**
   (servis o'zi qayta ishga tushadi)
3. Bir nechta odam bo'lsa — vergul bilan: `123456789,987654321`

### Adminlar uchun "Admin panel" tugmasi

`ADMIN_CHAT_IDS` da shaxsiy Chat ID'si yozilgan odamlarga botda alohida
**🛠 Admin panel** tugmasi chiqadi:

- `/start` xabari ostida — "Do'konni ochish" tugmasi tagida;
- pastki **Menu** tugmasi ham ularda admin panelni ochadi;
- `/admin` buyrug'i — tugmani istalgan payt qayta yuboradi.

**Render'ga kirmasdan admin qo'shish:** odam botga `/admin PAROL` deb yozadi
(PAROL — admin panel paroli, `ADMIN_PASSWORD`). Parol to'g'ri bo'lsa, u bazada
admin deb belgilanadi va tugma o'sha zahoti chiqadi. Parolli xabar chatdan
avtomatik o'chiriladi; 1 soatda 5 martadan ko'p xato urinishga ruxsat yo'q.

Tugma orqali ochilganda admin panel **parolsiz** kiradi: Telegram foydalanuvchini
tasdiqlaydi va backend uning ID'si `ADMIN_CHAT_IDS` da borligini tekshiradi.
Brauzerdan ochilganda esa avvalgidek parol so'raladi.

**Guruhga yuborish** (bir nechta menejer bo'lsa qulay): botni Telegram
guruhga qo'shing, guruhda `/id` yozing va chiqqan raqamni (minus bilan
boshlanadi, masalan `-1001234567890`) `ADMIN_CHAT_IDS` ga yozing.

> ⚠️ Odam avval botga **/start** bosgan bo'lishi shart — Telegram bot
> hech qachon o'zi birinchi yozmagan odamga xabar yubora olmaydi.

---

## ⚠️ Bilib qo'yish kerak bo'lgan ikki cheklov

### 1. Free tier uxlab qoladi

Render'ning bepul rejasida servis **15 daqiqa harakatsizlikdan keyin o'chadi**.
Uyg'onishi **~50 soniya** oladi, oyiga esa 750 soat limit bor.

Bot bu holatga tayyor: servis manzili https bo'lsa, u **webhook rejasida** ishlaydi
(`backend/src/core/bot.js`). Telegram xabarni serverga HTTP so'rov qilib yuboradi
va **o'sha so'rov uxlagan servisni uyg'otadi** — bot javob beradi, faqat birinchi
xabar kechikadi. Polling rejimida bunday bo'lmasdi: uxlagan servis Telegram'ga
o'zi murojaat qilmaydi va bot butunlay jim qolardi.

Mini App ham tayyor: ulanish uzilsa 3 marta qayta urinadi va ekranda
"Server uyg'onmoqda, biroz kuting..." yoziladi.

| Variant | Narx | Izoh |
|---|---|---|
| Hozirgi holat (webhook) | bepul | Bot ishlaydi, birinchi xabar ~50 soniya kechikadi |
| **Starter reja** | $7/oy | Kechikish ham yo'qoladi — haqiqiy do'kon uchun tavsiya qilaman |
| Tashqi ping xizmati | bepul | 750 soat limitini tez tugatadi, tavsiya qilmayman |

> ⚠️ **Kompyuterda ishga tushirganda diqqat.** Lokal ishlaganda manzil
> https bo'lmaydi, shuning uchun bot polling rejimiga tushadi va Render'dagi
> webhook'ni **o'chirib yuboradi** (ikkalasi bir vaqtda ishlay olmaydi).
> Tugatgach Render'da **Manual Deploy** qiling — webhook qayta tiklanadi.

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

## 5-QISM: Xatolar va yechimlar

Deploy paytida eng ko'p uchragan xatolar — log matni bo'yicha topiladi.

| Logdagi xato | Sabab | Yechim |
|---|---|---|
| `Can't reach database server ...-pooler...` (`P1001`) | `DATABASE_URL` da `-pooler` bor | Neon → **Connect** → **Connection pooling** ni o'chirib, qatorni qayta nusxalang |
| `Can't reach database server at HOST.neon.tech` | `.env.example` dagi namuna matn ko'chirilgan | Haqiqiy qatorni Neon konsolidan oling |
| `The table 'public.users' does not exist` | Build Command'da `prisma db push` yo'q | Build Command'ni to'liq yozing (3-qadamga qarang) |
| Yangi mahsulot katalogda ko'rinmayapti | o'zgarish `main` ga merge qilinmagan yoki seed ishlamagan | PR'ni merge qiling; Build Command oxirida `&& npm run db:seed` turganini tekshiring |
| `MINIAPP_URL https emas (http://localhost:5173)` | `MINIAPP_URL` qo'yilmagan | Environment: `MINIAPP_URL=https://asf-miniapp.vercel.app` |
| Bot `/start` ga umuman javob bermaydi | handler ichida xato (odatda baza) | Logdan `Bot handler xatosi:` qatorini qidiring |
| `409 Conflict` | bot ikki joyda ishlayapti | Kompyuterdagi `2-BACKEND.bat` oynasini yoping |
| Bot jim, lekin logda xato yo'q | webhook o'chib qolgan (lokal ishlatilgan) | Render → **Manual Deploy** |
| Logda `Bot polling rejasida` (Render'da) | servis manzili aniqlanmadi | Render → **Manual Deploy**; `PUBLIC_URL` qo'lda yozilgan bo'lsa o'chiring |
| Logda `PUBLIC_URL ... farq qiladi` | qo'lda yozilgan manzil eskirgan | Render → **Environment** → `PUBLIC_URL` ni o'chiring |

### `DATABASE_URL` tekshiruv ro'yxati

| ✅ To'g'ri | ❌ Xato |
|---|---|
| `postgresql://neondb_owner:npg_...` | `USER:PASSWORD@HOST` — namuna matn |
| `:` atrofida bo'shliqsiz | `neondb_owner : npg_...` |
| `-pooler` yo'q | `...-pooler.c-6...` |
| qo'shtirnoqsiz | `"postgresql://..."` |
| oxirida `?sslmode=require` | kesilgan qator |

### Mini App'da "Serverga ulanib bo'lmadi"

Backend manzili (`VITE_API_URL`) build paytida kodga yozilib qoladi. Vercel'da
build eski bo'lsa, ichida `localhost` qolib ketadi va brauzer so'rovni bloklaydi.

Kod buni o'zi hal qiladi: `VITE_API_URL` berilmagan yoki jonli saytda `localhost`
bo'lsa, ilova avtomatik `https://asfgroup.onrender.com` ga murojaat qiladi
(`miniapp/src/lib/api.js`, `admin/src/lib/api.js`). Shunga qaramay Vercel'da
**0-QISM** dagi `Root Directory` sozlamasi qo'yilgani ma'qul — bo'lmasa har push'da
build yiqiladi va yangi o'zgarishlar jonli saytga chiqmaydi.

Servis uyquda bo'lsa, ilova darrov xato ko'rsatmaydi: ulanish uzilsa 3 marta
qayta urinadi va ekranda "Server uyg'onmoqda, biroz kuting..." yoziladi.

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
