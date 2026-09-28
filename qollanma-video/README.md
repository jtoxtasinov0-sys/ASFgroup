# ASF GROUP — "Ekranga qo'shish" qo'llanma videolari

| Fayl | Telefon | Davomiyligi |
|---|---|---|
| `ASF-iPhone-qollanma.mp4` | iPhone · Safari | 34 s |
| `ASF-Samsung-qollanma.mp4` | Samsung (Android) · Chrome | 35 s |

Format: 1080×1920 (vertikal — Telegram, Instagram Stories/Reels uchun), 30 fps, ovozsiz.

## Qayta yaratish (matnni o'zgartirish uchun)

`manba/motion.html` — animatsiya (matnlar `caption(...)` qatorlarida).
Rasmlar `miniapp/public/` dan olinadi:

```bash
cd qollanma-video/manba
cp ../../miniapp/public/{logo.png,apple-touch-icon.png} .
pip install imageio-ffmpeg && npm i -g playwright
export FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
node render.cjs video iphone  ../ASF-iPhone-qollanma.mp4
node render.cjs video samsung ../ASF-Samsung-qollanma.mp4
```

Brauzerda ko'rish: `motion.html?v=iphone&t=12` (t — soniya).
