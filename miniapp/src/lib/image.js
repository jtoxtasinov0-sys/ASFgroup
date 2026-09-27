/**
 * Telefondan olingan katta rasmni yuklashdan oldin kichraytiradi (JPEG, max 1600px).
 * Chekdagi yozuvlar o'qiladigan darajada qoladi, yuklash esa tezlashadi.
 * Kichraytirib bo'lmasa — asl fayl qaytariladi.
 */
export async function compressImage(file, maxSide = 1600, quality = 0.85) {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
  } catch (_) {
    return file;
  }
}

/**
 * <img onError={retryImage}> — rasm yuklanmay qolsa (server endi uyg'onayotgan
 * yoki rasm bazadan tiklanayotgan bo'lsa) 1.5 va 4 soniyadan keyin qayta so'raydi.
 * Shunda kartochkada "?" belgisi qolib ketmaydi.
 */
const RETRY_DELAYS = [1500, 4000];
export function retryImage(e) {
  const img = e.currentTarget;
  const tries = Number(img.dataset.retry || 0);
  if (tries >= RETRY_DELAYS.length || !img.src || img.src.startsWith('blob:')) return;
  img.dataset.retry = String(tries + 1);
  const src = img.src.replace(/([?&])r=\d+&?/, '$1').replace(/[?&]$/, '');
  setTimeout(() => {
    img.src = `${src}${src.includes('?') ? '&' : '?'}r=${tries + 1}`;
  }, RETRY_DELAYS[tries]);
}
