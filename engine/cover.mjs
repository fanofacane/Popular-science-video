// Usage: node cover.mjs <cover.html> <out.png> [width] [height]
import { chromium } from 'playwright';
import path from 'node:path';

const [page_, out, w = '1080', h = '1920'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('pageerror', e => console.error('[page error]', e));
await page.goto('file://' + path.resolve(page_));
await page.evaluate(() => window.ready);
await page.screenshot({ path: path.resolve(out) });
await browser.close();
console.log('done', out);
