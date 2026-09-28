# Click to'lov tizimini ulash — qadamma-qadam

Natija: mijoz buyurtma berganda Mini App'da **"To'lovni yakunlang"** oynasi ochiladi:

| Tugma | Nima bo'ladi |
|---|---|
| 🔵 **Click bilan to'lash** | Click ilovasi ochiladi (kompyuterda — QR-kod), mijoz to'laydi |
| 🟢 **Karta bilan to'lash** | Click sahifasida Uzcard / Humo karta raqami + SMS-kod bilan to'laydi (ilova shart emas) |

To'lov o'tishi bilan Click serverimizga xabar beradi va:

- Mini App'da **"To'lov qabul qilindi! ✓"** ekrani o'zi ochiladi;
- buyurtma **To'langan** va **Tasdiqlandi** holatiga o'tadi (admin panelda ko'rinadi);
- mijozga botdan "to'lov tasdiqlandi", adminlarga "Click orqali to'landi" xabari boradi.

---

## 1-qadam. Click bilan shartnoma tuzish (merchant bo'lish)

Click faqat **YaTT yoki yuridik shaxs** bilan ishlaydi.

1. https://click.uz → **"Biznesga" / "Для бизнеса"** → **"Подключиться"** (yoki Click call-markazi: **+998 71 231 08 80**).
2. Arizada tanlang: **Internet-do'kon / onlayn to'lov qabul qilish (SHOP API)**.
3. Tayyorlab qo'ying:
   - guvohnoma (YaTT) yoki ustav/guvohnoma (MChJ);
   - STIR (INN);
   - bank rekvizitlari: hisob raqam, bank, MFO;
   - rahbar pasporti, telefon, e-mail.
4. Click menejeri ariza anketasida **texnik ma'lumotlarni** so'raydi — pastdagi 2-qadamdagini bering.
5. Shartnoma imzolanadi. Komissiya foizini Click menejeri aytadi.

## 2-qadam. Click'ga beriladigan texnik ma'lumotlar

| Maydon | Qiymat |
|---|---|
| Sayt / xizmat manzili | `https://asf-miniapp.vercel.app` |
| Bot | `https://t.me/asfgroupbot` |
| Integratsiya turi | **SHOP API** (Prepare / Complete) |
| **Prepare URL** | `https://asfgroup.onrender.com/api/click/prepare` |
| **Complete URL** | `https://asfgroup.onrender.com/api/click/complete` |
| To'lov identifikatori (`merchant_trans_id`) | Buyurtma raqami (masalan `42`) |

> Backend manzilingiz boshqa bo'lsa, `asfgroup.onrender.com` o'rniga Render'dagi
> servis manzilingizni yozing (brauzerda `/api/health` ochilishi kerak).

## 3-qadam. Kalitlarni olish

Shartnomadan so'ng Click **merchant.click.uz** kabinetiga login beradi. U yerda
(yoki Click yuborgan xatda) quyidagilar bo'ladi:

| Click'da nomi | Bizda |
|---|---|
| `SERVICE_ID` | `CLICK_SERVICE_ID` |
| `MERCHANT_ID` | `CLICK_MERCHANT_ID` |
| `SECRET_KEY` | `CLICK_SECRET_KEY` |
| `MERCHANT_USER_ID` | kerak emas |

⚠️ `SECRET_KEY` — maxfiy. Uni hech kimga yubormang, GitHub'ga yozmang.

## 4-qadam. Kalitlarni serverga qo'yish (Render)

1. https://dashboard.render.com → **asfgroup** servisi → **Environment**.
2. **Add Environment Variable** orqali uchta qator qo'shing:
   ```
   CLICK_SERVICE_ID  = 12345
   CLICK_MERCHANT_ID = 67890
   CLICK_SECRET_KEY  = AbCdEf123...
   ```
3. **Save Changes** → servis o'zi qayta ishga tushadi (yoki **Manual Deploy → Deploy latest commit**).
4. Build paytida `npx prisma db push` bazaga yangi ustunlarni (`clickTransId`, `paidAt`) o'zi qo'shadi.

Kompyuterda ishlatayotgan bo'lsangiz — xuddi shu uch qatorni `backend/.env` ga yozing.

## 5-qadam. Click kabinetida manzillarni tekshirish

merchant.click.uz → **Сервисы** → servisingiz → sozlamalar:

- **Prepare URL** va **Complete URL** 2-qadamdagidek ekanini tekshiring;
- servis holati **Активен** bo'lishi kerak.

## 6-qadam. Sinab ko'rish

1. Telegram'da botni oching → do'kon → biror mahsulotni savatchaga qo'shing.
2. Buyurtma oynasida to'lov usuli: **Click** → **Buyurtmani tasdiqlash**.
3. **"To'lovni yakunlang"** oynasi chiqadi → **Click bilan to'lash** yoki **Karta bilan to'lash**.
4. To'lang va Telegram'ga qayting — bir necha soniyada **"To'lov qabul qilindi!"** ekrani chiqadi.
5. Tekshiring:
   - botda mijozga "✅ to'lov tasdiqlandi" xabari;
   - adminlarga "💳 Click orqali to'landi!" xabari;
   - admin panel → Buyurtmalar: holat **Tasdiqlandi**, to'lov **To'langan**.

> Birinchi sinovni kichik summali mahsulot bilan qiling (Click'da eng kam to'lov — 1 000 so'm).

Mijoz oynani yopib qo'ysa ham muammo yo'q: **Profil → Mening buyurtmalarim** da
to'lanmagan Click buyurtmasi yonida **"💳 Click orqali to'lash"** tugmasi turadi.

---

## Muammo bo'lsa

Render → servis → **Logs** da `Click /prepare` yoki `Click /complete` qatorlarini qidiring:

| Log / belgi | Sabab | Yechim |
|---|---|---|
| `-1 SIGN CHECK FAILED` | `CLICK_SECRET_KEY` noto'g'ri yoki boshqa servisniki | Kalitni kabinetdan qayta nusxalang (bo'sh joysiz) |
| `-2 Incorrect parameter amount` | Summa buyurtmadagidan farq qiladi | Click sahifasida summani o'zgartirmang |
| `-4 Already paid` | Buyurtma allaqachon to'langan | Hech narsa qilish shart emas |
| `-5 User does not exist` | Bunday raqamli buyurtma yo'q | Buyurtmani qaytadan bering |
| `-9 Transaction cancelled` | Buyurtma bekor qilingan yoki Click to'lovni rad etdi | Yangi buyurtma bering |
| Click sahifasida "Сервис не найден" | `CLICK_SERVICE_ID` / `CLICK_MERCHANT_ID` xato | Render → Environment ni tekshiring |
| Logda Click qatori umuman yo'q | Prepare/Complete URL noto'g'ri yoki servis faol emas | 5-qadamni qayta tekshiring |
| To'lov o'tdi, lekin natija chiqmadi | Server javob bermadi | Logs'ni tekshiring; admin panelda to'lovni qo'lda "To'langan" qilish mumkin |

## Qanday ishlaydi (dasturchi uchun)

- `backend/src/services/click.js` — Prepare/Complete, `sign_string` MD5 tekshiruvi, xato kodlari.
- `backend/src/routes/click.routes.js` — `POST /api/click/prepare`, `POST /api/click/complete`.
- `GET /api/orders/:id/status` — Mini App har 3 soniyada to'lov holatini so'raydi.
- `GET /api/orders/:id/click` — "Buyurtmalarim" dan keyinroq to'lash uchun havolalar.
- `miniapp/src/components/ClickPayScreen.jsx` — to'lov oynasi.
- To'lov havolalari: `https://my.click.uz/services/pay?service_id=…&merchant_id=…&amount=…&transaction_param=<buyurtma raqami>&return_url=…`,
  karta uchun qo'shimcha `&card_type=uzcard`.
