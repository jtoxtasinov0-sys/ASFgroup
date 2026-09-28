"""
ASF GROUP qo'llanma videolari uchun musiqa va ovoz effektlari.

Hammasi shu yerda sintez qilinadi (tashqi audio fayl yo'q — mualliflik huquqi muammosi yo'q).
Vaqtlar motion.html dagi animatsiya bilan bir xil.

    python3 audio.py iphone  ../iphone.wav
    python3 audio.py samsung ../samsung.wav
"""
import sys
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a=0.01, r=0.1):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, cutoff):
    """Bir qutbli past chastota filtri (cutoff — son yoki massiv)."""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s)
        y[i] = s
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def reverb(x, secs=1.6, mix=0.22):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 4.2)
    ir[0] = 0
    L = len(x) + n
    size = 1 << (L - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    wet *= np.max(np.abs(x)) + 1e-9
    return x * (1 - mix) + wet * mix


def add(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


# ------------------------------------------------------------------ Asboblar

def pluck(f, dur=0.5, bright=1.0):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * f * t) + 0.45 * bright * np.sin(4 * np.pi * f * t) + 0.18 * bright * np.sin(6 * np.pi * f * t)
    return s * np.exp(-t * 7) * env_adsr(len(t), 0.004, 0.05)


def pad(freqs, dur):
    t = t_axis(dur)
    s = np.zeros_like(t)
    for f in freqs:
        for d in (-0.12, 0.0, 0.13):
            ff = f * 2 ** (d / 12)
            s += np.sin(2 * np.pi * ff * t) + 0.25 * np.sin(4 * np.pi * ff * t + 0.3)
    s /= len(freqs) * 3
    lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t)
    return s * lfo * env_adsr(len(t), 0.5, 0.7)


def bass(f, dur):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    return s * np.exp(-t * 2.2) * env_adsr(len(t), 0.006, 0.08)


def kick():
    t = t_axis(0.35)
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9)


def hat(dur=0.06):
    t = t_axis(dur)
    return lowpass(highpass(rng.standard_normal(len(t)), 7000), 12000) * np.exp(-t * 70)


def clap():
    t = t_axis(0.25)
    n = highpass(lowpass(rng.standard_normal(len(t)), 3500), 900)
    e = np.exp(-t * 22)
    for d in (0.0, 0.011, 0.022):
        e += 0.6 * (t >= d) * np.exp(-np.clip(t - d, 0, None) * 180)
    return n * e * 0.5


# ------------------------------------------------------------------ Musiqa

def music(T):
    bpm = 104
    beat = 60 / bpm
    bar = beat * 4
    buf = np.zeros(int((T + 3) * SR))
    # C - G - Am - F (yorug', ishonchli kayfiyat)
    prog = [
        (48, [60, 64, 67, 72]),
        (43, [59, 62, 67, 71]),
        (45, [60, 64, 69, 72]),
        (41, [60, 65, 69, 72]),
    ]
    arp_order = [0, 1, 2, 3, 2, 1, 2, 3]
    nbars = int(T / bar) + 2
    for b in range(nbars):
        t0 = b * bar
        root, chord = prog[b % 4]
        full = t0 >= bar * 1  # 1-taktdan keyin to'liq ritm
        add(buf, pad([midi(m) for m in chord[:3]], bar + 0.6), t0, 0.16)
        add(buf, bass(midi(root), beat * 1.6), t0, 0.32 if full else 0.0)
        add(buf, bass(midi(root), beat * 1.2), t0 + beat * 2.5, 0.22 if full else 0.0)
        for i in range(8):
            m = chord[arp_order[i]] + 12
            add(buf, pluck(midi(m), 0.45, 0.8), t0 + i * beat / 2, 0.075 if i % 2 == 0 else 0.055)
        if full:
            for k in range(4):
                add(buf, kick(), t0 + k * beat, 0.5)
                add(buf, hat(), t0 + k * beat + beat / 2, 0.06)
            add(buf, clap(), t0 + beat, 0.16)
            add(buf, clap(), t0 + beat * 3, 0.16)
    buf = reverb(buf, 1.4, 0.18)
    t = t_axis(len(buf) / SR)
    fade = np.clip(t / 1.2, 0, 1) * np.clip((T - t) / 2.2, 0, 1)
    return buf * fade


# ------------------------------------------------------------------ Effektlar

def sfx_tap():
    t = t_axis(0.09)
    s = np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 110) * 0.6
    s += np.sin(2 * np.pi * 820 * t) * np.exp(-t * 60)
    s += highpass(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300) * 0.25
    return s * 0.7


def sfx_pop(f0=320, f1=980, dur=0.12):
    t = t_axis(dur)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) * env_adsr(len(t), 0.002, 0.02)


def sfx_whoosh(dur=0.55, lo=300, hi=4200, up=True):
    t = t_axis(dur)
    x = t / dur
    shape = np.sin(np.pi * x) ** 2
    cut = lo + (hi - lo) * (x if up else 1 - x) ** 1.3
    # Ikki marta filtrlash — shovqin yumshoq, "havo" kabi eshitiladi
    n = lowpass(lowpass(rng.standard_normal(len(t)), cut), cut * 1.2)
    n = highpass(n, 150)
    return n / (np.max(np.abs(n)) + 1e-9) * shape


def sfx_swish():
    return sfx_whoosh(0.32, 1200, 5000) * 0.5


def sfx_error():
    out = np.zeros(int(0.32 * SR))
    for i, at in enumerate((0.0, 0.14)):
        t = t_axis(0.1)
        f = 210 if i == 0 else 180
        s = np.sign(np.sin(2 * np.pi * f * t)) * 0.35 + np.sin(2 * np.pi * f * t) * 0.5
        s = lowpass(s, 1800) * env_adsr(len(t), 0.004, 0.03)
        add(out, s, at)
    return out


def bell(f, dur=1.4):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 10)
    return s * np.exp(-t * 3.2) * env_adsr(len(t), 0.003, 0.1)


def sfx_success():
    out = np.zeros(int(2.0 * SR))
    for i, m in enumerate((84, 88, 91, 96)):
        add(out, bell(midi(m)), i * 0.075, 0.28)
    return reverb(out, 1.2, 0.3)


def sfx_sparkle(n=7):
    out = np.zeros(int(1.3 * SR))
    for i in range(n):
        m = rng.choice([96, 98, 100, 103, 105, 108])
        add(out, bell(midi(m), 0.5), 0.05 + i * 0.09 + rng.uniform(0, 0.03), 0.09)
    return out


def sfx_boom():
    t = t_axis(1.6)
    f = 42 + 50 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.5)
    return s * env_adsr(len(t), 0.005, 0.2)


def sfx_launch():
    out = sfx_whoosh(0.7, 250, 6000) * 0.8
    add(out, sfx_pop(500, 1400, 0.15), 0.45, 0.5)
    return out


# ------------------------------------------------------------------ Vaqt jadvali

CUES = {
    'iphone': dict(
        T=34.0, phone_in=3.0, outro=30.2,
        captions=[3.6, 7.3, 10.9, 15.1, 19.0, 22.4, 26.2],
        taps=[9.0, 13.6, 17.6, 20.8, 26.7],
        pops=[9.05],
        whooshes=[(13.9, 0.5), (17.9, 0.5), (21.1, 0.6)],
        error=11.6, url_ring=[4.8, 5.8], scroll=15.6,
        success=22.3, launch=26.85,
    ),
    'samsung': dict(
        T=35.0, phone_in=3.0, outro=31.2,
        captions=[3.6, 7.3, 10.8, 14.8, 18.8, 22.4, 27.0],
        taps=[9.0, 13.6, 16.8, 27.5],
        pops=[9.05, 14.05, 17.4],
        whooshes=[(20.2, 0.6)],
        error=None, url_ring=[4.8, 5.8], scroll=None,
        success=22.6, launch=27.65,
    ),
}


def build(variant):
    c = CUES[variant]
    T = c['T']
    sfx = np.zeros(int((T + 3) * SR))

    # Kirish: logo zarbasi va jiringlash
    add(sfx, sfx_boom(), 0.05, 0.55)
    add(sfx, sfx_sparkle(6), 0.25, 0.8)
    add(sfx, sfx_whoosh(0.7, 200, 5000), 0.6, 0.18)
    # Telefon ko'tariladi
    add(sfx, sfx_whoosh(0.9, 180, 3500), c['phone_in'] - 0.35, 0.42)
    # Har bir yangi qadam sarlavhasi
    for t in c['captions']:
        add(sfx, sfx_swish(), t - 0.05, 0.32)
    for t in c['url_ring']:
        add(sfx, sfx_pop(700, 1100, 0.08), t, 0.16)
    for t in c['taps']:
        add(sfx, sfx_tap(), t - 0.02, 0.55)
    for t in c['pops']:
        add(sfx, sfx_pop(), t, 0.3)
    for t, d in c['whooshes']:
        add(sfx, sfx_whoosh(d), t - 0.1, 0.36)
    if c['scroll'] is not None:
        add(sfx, sfx_whoosh(0.8, 400, 2200, up=False), c['scroll'], 0.14)
    if c['error'] is not None:
        add(sfx, sfx_error(), c['error'], 0.42)
    # Belgi paydo bo'lishi
    s = c['success']
    add(sfx, sfx_pop(250, 900, 0.16), s, 0.55)
    add(sfx, sfx_success(), s + 0.1, 0.85)
    add(sfx, sfx_sparkle(), s + 0.35, 0.8)
    add(sfx, sfx_launch(), c['launch'] - 0.1, 0.45)
    # Yakun
    o = c['outro']
    add(sfx, sfx_whoosh(0.9, 3500, 200, up=False), o - 0.15, 0.35)
    add(sfx, sfx_boom(), o + 0.75, 0.4)
    add(sfx, sfx_success(), o + 0.8, 0.6)

    mix = music(T) * 0.62 + sfx
    mix = mix[: int(T * SR)]
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)  # yumshoq cheklagich
    mix *= 0.89 / (np.max(np.abs(mix)) + 1e-9)
    return mix


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    stereo = np.stack([pcm, pcm], axis=1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())


if __name__ == '__main__':
    variant, out = sys.argv[1], sys.argv[2]
    write_wav(out, build(variant))
    print('ok', out)
