// Shared building blocks for every episode: easing, captions, labels, title card, backgrounds.
// An episode page loads common.css + common.js, then defines its own timeline and window.render.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
// fade in over [a, a+fi], out over [b-fo, b]
const env = (t, a, b, fi = .4, fo = .4) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));
function hash(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
const GOLD = '245,215,110', RED = '232,72,58';
const SANS = '"Noto Sans SC"', MONO = '"JetBrains Mono", "Noto Sans SC"', SERIF = '"Noto Serif SC"';
const W = 1920, H = 1080;

const ui = document.getElementById('ui');
const cv = document.getElementById('bg'); const ctx = cv.getContext('2d');
const ALLTEXT = [];

// ---------- captions ----------
// markup: {g:text} gold, {r:text} red, {s:text} red + struck through
const CUES = [];
function cue(start, end, top, size, lines, extra = {}) {
  const el = document.createElement('div'); el.className = 'cap'; el.style.top = top + 'px'; el.style.fontSize = size + 'px';
  if (extra.lineHeight) el.style.lineHeight = extra.lineHeight;
  const chars = [], strikes = [];
  lines.forEach(ln => {
    const lineEl = document.createElement('span'); lineEl.className = 'ln';
    const delay = ln.delay || 0; let idx = 0;
    const re = /\{([grs]):([^}]*)\}|([^{]+)/g; let m;
    while ((m = re.exec(ln.text))) {
      let cls = m[1] || ''; const txt = m[2] ?? m[3]; let host = lineEl;
      if (cls === 's') {
        cls = 'r'; host = document.createElement('span'); host.className = 'grp'; lineEl.appendChild(host);
        const bar = document.createElement('i'); bar.className = 'strike'; host.appendChild(bar); strikes.push(bar);
      }
      for (const ch of txt) {
        const s = document.createElement('span'); s.className = 'c' + (cls ? ' ' + cls : '');
        s.textContent = ch === ' ' ? ' ' : ch; host.appendChild(s);
        chars.push({ el: s, t0: start + delay + idx * 0.045 }); idx++;
      }
    }
    el.appendChild(lineEl);
  });
  ui.appendChild(el);
  CUES.push({ start, end, el, chars, strikes, strikeAt: extra.strikeAt });
}
function renderCues(t) {
  for (const c of CUES) {
    const vis = t >= c.start - .01 && t <= c.end + .01;
    c.el.style.display = vis ? 'block' : 'none'; if (!vis) continue;
    const out = seg(t, c.end - .4, c.end);
    for (const ch of c.chars) {
      const k = easeOut(seg(t, ch.t0, ch.t0 + .45));
      ch.el.style.opacity = k * (1 - out);
      ch.el.style.filter = `blur(${(1 - k) * 14 + out * 10}px)`;
      ch.el.style.transform = `translateY(${(1 - k) * 10}px)`;
    }
    for (const b of c.strikes) { const k = easeInOut(seg(t, c.strikeAt, c.strikeAt + .45)); b.style.width = (k * 108) + '%'; b.style.opacity = 1 - out; }
  }
}

// ---------- small mono lines, source lines, corner label ----------
const METAS = [];
function meta(start, end, top, text, color, cls = 'meta') {
  const el = document.createElement('div'); el.className = cls; el.textContent = text;
  if (top != null) el.style.top = top + 'px'; if (color) el.style.color = color;
  ui.appendChild(el); METAS.push({ start, end, el });
}
const src = (start, end, text) => meta(start, end, null, text, null, 'src');
const LABELS = [];
const labelEl = document.createElement('div'); labelEl.className = 'label'; ui.appendChild(labelEl);
function renderMeta(t) {
  let lt = '', la = 0;
  for (const [a, b, s] of LABELS) if (t >= a && t <= b) { lt = s; la = env(t, a, b, .5, .4); }
  labelEl.textContent = lt; labelEl.style.opacity = la;
  for (const m of METAS) m.el.style.opacity = env(t, m.start, m.end, .5, .4);
}

// ---------- title card ----------
// windows: [[start, end], ...] — the same title can play more than once
function makeTitle(kicker, main, sub, windows) {
  const el = document.createElement('div'); el.id = 'title';
  el.innerHTML = `<div class="kicker"></div><div class="main"></div><div class="sub"></div>`;
  el.querySelector('.kicker').textContent = kicker; el.querySelector('.sub').textContent = sub;
  const mainEl = el.querySelector('.main');
  const chars = [...main].map(ch => { const s = document.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch; mainEl.appendChild(s); return s; });
  const dot = document.createElement('i'); dot.className = 'dot'; mainEl.appendChild(dot);
  ui.appendChild(el);
  const kEl = el.querySelector('.kicker'), sEl = el.querySelector('.sub');
  return t => {
    const w = windows.find(([a, b]) => t >= a && t <= b);
    el.style.display = w ? 'block' : 'none'; if (!w) return;
    const [a, b] = w, tt = t - a, last = w === windows[windows.length - 1] && windows.length > 1;
    el.style.opacity = env(t, a, b, .3, last ? 1.0 : .45); el.style.transform = `scale(${1 + 0.035 * seg(t, a, b)})`;
    kEl.style.opacity = seg(tt, .2, .8);
    chars.forEach((c, i) => { const k = easeOut(seg(tt, .35 + i * .09, .95 + i * .09)); c.style.opacity = k; c.style.filter = `blur(${(1 - k) * 18}px)`; });
    dot.style.opacity = seg(tt, 1.2, 1.5) * (0.75 + 0.25 * Math.sin(t * 6));
    const sk = easeOut(seg(tt, 1.3, 2.1)); sEl.style.opacity = sk; sEl.style.letterSpacing = `${0.5 + 0.4 * sk}em`;
  };
}

// ---------- canvas helpers ----------
function text(s, x, y, font, color, align = 'left', alpha = 1, glow = 0) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; } ctx.fillText(s, x, y); ctx.restore();
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function clearFrame() { ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#070707'; ctx.fillRect(0, 0, W, H); }
function floor(alpha, horizon = 640) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = 'rgba(255,214,150,0.10)'; ctx.lineWidth = 1.2;
  const vx = W / 2;
  for (let i = -24; i <= 24; i++) { const x = vx + i * 160; ctx.beginPath(); ctx.moveTo(vx + (x - vx) * 0.12, horizon); ctx.lineTo(x + (x - vx) * 2.2, H + 300); ctx.stroke(); }
  for (let k = 1; k < 16; k++) { const y = horizon + Math.pow(k / 15, 2.1) * (H - horizon + 80); ctx.globalAlpha = alpha * (0.3 + 0.7 * k / 15); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
  const g = ctx.createRadialGradient(W / 2, horizon, 10, W / 2, horizon, 700);
  g.addColorStop(0, `rgba(255,200,120,${0.10 * alpha})`); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function dotGrid(alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.fillStyle = `rgba(255,240,210,${0.06 * alpha})`;
  for (let y = 30; y < H; y += 40) for (let x = 30; x < W; x += 40) ctx.fillRect(x, y, 2, 2);
  ctx.restore();
}

// ---------- font preload ----------
async function loadFonts(extra = '') {
  const txt = [...document.querySelectorAll('#ui *')].map(e => e.textContent).join('') + ALLTEXT.join('') + extra +
    '0123456789%万千年月日：:.,/·+-—… ';
  await Promise.all([
    document.fonts.load(`900 64px ${SERIF}`, txt), document.fonts.load(`500 22px ${SANS}`, txt),
    document.fonts.load(`700 44px ${SANS}`, txt), document.fonts.load(`400 20px ${MONO}`, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789·/–.%:#'),
  ]);
  await document.fonts.ready;
}
