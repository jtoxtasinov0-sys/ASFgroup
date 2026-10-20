/**
 * Telefondan olingan katta rasmni (5-10 MB) yuklashdan oldin kichraytiradi:
 * max 1600px, JPEG ~82%. Natijada fayl ~200-400 KB bo'ladi — yuklash ham,
 * Mini App'da ochilishi ham bir necha barobar tezlashadi.
 * Kichik fayllar, GIF va kichraytirib bo'lmaydigan rasmlar o'zgarmaydi.
 */
const MAX_SIDE = 1600;
const MIN_BYTES = 300 * 1024;

export async function compressImage(file, maxSide = MAX_SIDE, quality = 0.82) {
  const convertible = /^image\/(jpeg|jpg|png|webp|heic|heif)$/.test(file.type);
  const mustConvert = /^image\/hei[cf]$/.test(file.type); // server HEIC qabul qilmaydi
  if (!convertible || (file.size < MIN_BYTES && !mustConvert)) return file;

  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    }).finally(() => URL.revokeObjectURL(url));

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    // PNG'dagi shaffof joylar JPEG'da qora bo'lib qolmasin
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || (blob.size >= file.size && !mustConvert)) return file;
    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch (_) {
    return file;
  }
}

/**
 * iPhone (Safari, Telegram) galereyadan tanlangan faylga taxminan 1 daqiqadan
 * keyin ruxsatni yopib qo'yadi. Forma to'ldirilguncha shu vaqt o'tib ketadi va
 * "Saqlash" bosilganda rasmni yuborib bo'lmaydi — brauzer buni ulanish xatosi
 * deb ko'rsatadi ("Serverga ulanib bo'lmadi"). Shuning uchun fayl tanlangan
 * zahoti xotiraga ko'chirib olinadi. O'qib bo'lmasa — asl fayl qaytariladi.
 */
export async function toMemoryFile(file) {
  try {
    const data = await file.arrayBuffer();
    return new File([data], file.name || 'photo.jpg', {
      type: file.type,
      lastModified: file.lastModified,
    });
  } catch (_) {
    return file;
  }
}

/*
 * Rasm tanlangan zahoti fonda siqila boshlaydi — "Saqlash" bosilganda
 * tayyor natija darhol olinadi. Telefon xotirasi to'lib qolmasin deb
 * rasmlar birin-ketin siqiladi. Bir fayl ikki marta siqilmaydi.
 */
const compressed = new WeakMap();
let queue = Promise.resolve();

function compressOnce(file) {
  if (!compressed.has(file)) {
    const job = queue.then(() => compressImage(file));
    queue = job.catch(() => {});
    compressed.set(file, job);
  }
  return compressed.get(file);
}

/** Tanlangan rasmlarni oldindan (fonda) siqib qo'yadi */
export function precompressImages(files) {
  files.forEach((file) => compressOnce(file).catch(() => {}));
}

/** Bir nechta rasmni siqadi (tartib saqlanadi) */
export function compressImages(files) {
  return Promise.all(files.map((file) => compressOnce(file)));
}
