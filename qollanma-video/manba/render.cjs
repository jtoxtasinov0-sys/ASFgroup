const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { spawn } = require('child_process');
const path = require('path');
const [, , mode, variant, arg] = process.argv; // mode: stills|video
const FFMPEG = process.env.FFMPEG;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await p.goto('file://' + path.resolve('motion.html') + '?v=' + variant);
  await p.evaluate(() => window.READY);
  const T = await p.evaluate(() => window.DURATION);
  if (mode === 'stills') {
    for (const t of arg.split(',').map(Number)) {
      await p.evaluate(t => render(t), t);
      await p.screenshot({ path: `stills/${variant}-${t}.png` });
    }
  } else {
    const fps = 30, n = Math.round(T * fps);
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', arg], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < n; i++) {
      await p.evaluate(t => render(t), i / fps);
      const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(variant, i, '/', n);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
