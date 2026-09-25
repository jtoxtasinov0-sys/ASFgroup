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
