/**
 * "Savatga uchib tushish" animatsiyasi: mahsulot rasmining nusxasi
 * egri chiziq bo'ylab pastki menyudagi savatcha tugmasiga uchadi,
 * so'ng savatcha "sakraydi" va pastda kichik xabar chiqadi.
 */

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Savatcha tugmasini silkitadi (rasm yetib kelganda yoki animatsiyasiz) */
export function bumpCart() {
  const target = document.querySelector('[data-cart-target]');
  if (!target) return;
  target.classList.remove('bump');
  // Klassni qayta qo'shish animatsiyani boshidan boshlaydi
  void target.offsetWidth;
  target.classList.add('bump');
  setTimeout(() => target.classList.remove('bump'), 650);
}

let toastTimer = null;

/** Pastda "Savatchaga qo'shildi" xabari */
export function cartToast(text) {
  if (!text) return;
  let el = document.querySelector('.cart-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'cart-toast';
    document.body.appendChild(el);
  }
  el.innerHTML = '<span class="cart-toast-ic">✓</span><span></span>';
  el.lastChild.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/**
 * @param {HTMLElement|null} source  uchadigan rasm (yoki uning konteyneri)
 * @param {string} [toast]           pastda chiqadigan matn
 */
export function flyToCart(source, toast) {
  const target = document.querySelector('[data-cart-target]');
  const img = source?.tagName === 'IMG' ? source : source?.querySelector?.('img');

  if (!target || !img || reduced() || !img.animate) {
    bumpCart();
    cartToast(toast);
    return;
  }

  const from = img.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = Math.min(from.width, from.height, 150);

  const clone = img.cloneNode(true);
  clone.removeAttribute('loading');
  clone.className = 'fly-clone';
  Object.assign(clone.style, {
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
  });
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  // Yuqoriga ko'tarilib, keyin savatchaga tushadigan yoy
  const lift = Math.min(-60, dy * -0.25);
  const end = 34 / size;

  const anim = clone.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1, borderRadius: '24px' },
      {
        transform: `translate(${dx * 0.35}px, ${lift}px) scale(0.72) rotate(-8deg)`,
        opacity: 1,
        borderRadius: '40%',
        offset: 0.35,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${end}) rotate(12deg)`,
        opacity: 0.35,
        borderRadius: '50%',
      },
    ],
    { duration: 780, easing: 'cubic-bezier(0.55, 0, 0.35, 1)', fill: 'forwards' }
  );

  // Uchish paytida chiqadigan uchqunlar
  anim.onfinish = () => {
    clone.remove();
    bumpCart();
    sparkle(to);
  };
  cartToast(toast);
}

function sparkle(rect) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 8; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'fly-spark';
    dot.style.left = `${cx}px`;
    dot.style.top = `${cy}px`;
    document.body.appendChild(dot);
    const angle = (Math.PI * 2 * i) / 8;
    const dist = 26 + (i % 2) * 10;
    dot
      .animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${
              Math.sin(angle) * dist
            }px)) scale(0.2)`,
            opacity: 0,
          },
        ],
        { duration: 520, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }
      )
      .finished.then(() => dot.remove(), () => dot.remove());
  }
}
