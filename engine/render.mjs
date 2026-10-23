// Usage (from engine/): node render.mjs <page.html[#variant]> <out.mp4> [--fps 30] [--from 0] [--to DURATION] [--stills 1,5.5,12]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [pagePath, hash] = args[0].split('#'); const page_ = path.resolve(pagePath); const out = path.resolve(args[1]);
const fps = +opt('fps', 30);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.error('[page error]', e));
await page.goto('file://' + page_ + (hash ? '#' + hash : ''));
await page.evaluate(() => window.ready);
const duration = await page.evaluate(() => window.DURATION);

const stills = opt('stills');
if (stills) {
  fs.mkdirSync(out, { recursive: true });
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: path.join(out, `still_${t.toFixed(2)}.png`) });
  }
  await browser.close(); process.exit(0);
}

const from = +opt('from', 0), to = +opt('to', duration);
const n = Math.round((to - from) * fps);
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let f = 0; f < n; f++) {
  const t = from + f / fps;
  await page.evaluate(t => window.render(t), t);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 90 === 0) console.log(`frame ${f}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('done', out);
