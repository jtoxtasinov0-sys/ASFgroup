# ASF GROUP — "Ekranga qo'shish" qo'llanma videolari

| Fayl | Telefon | Davomiyligi |
|---|---|---|
| `ASF-iPhone-qollanma.mp4` | iPhone · Safari | 34 s |
| `ASF-Samsung-qollanma.mp4` | Samsung (Android) · Chrome | 35 s |

Format: 1080×1920 (vertikal — Telegram, Instagram Stories/Reels uchun), 30 fps.

Ovoz: fon musiqasi (104 BPM, C–G–Am–F) va harakatlarga mos effektlar (bosish, menyu, whoosh,
xato signali, belgi paydo bo'lganda jiringlash). Hammasi `manba/audio.py` da sintez qilingan —
tashqi audio ishlatilmagan, mualliflik huquqi muammosi yo'q.

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

# Ovoz (numpy kerak) va videoga qo'shish
pip install numpy
python3 audio.py iphone iphone.wav
$FFMPEG -i ../ASF-iPhone-qollanma.mp4 -i iphone.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out.mp4
```

Animatsiya vaqtlari o'zgarsa, `audio.py` dagi `CUES` jadvalini ham moslang.

Brauzerda ko'rish: `motion.html?v=iphone&t=12` (t — soniya).
