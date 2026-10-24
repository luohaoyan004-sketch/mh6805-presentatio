(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad2 = n => String(n).padStart(2, '0');
const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + pad2(s % 60); };
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const shuffle = (n, seed) => { const r = rng(seed), a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ======================= Liquid glass ======================= */
// Same principle as liquid-glass-react: an SVG displacement map, generated for each element's
// exact size, bends the backdrop near the rounded edge (and optionally magnifies the centre).
// Chromium renders SVG filters inside backdrop-filter; other engines keep the frosted fallback.
const REFRACT = /(Chrome|Chromium|Edg)\//.test(navigator.userAgent) && !/Firefox\//.test(navigator.userAgent);
const SVGNS = 'http://www.w3.org/2000/svg';
const defs = $('#lgDefs');
let lgCount = 0;

function buildMap(w, h, r, bezel, refract, mag) {
  const k = 0.5, cw = Math.max(4, Math.round(w * k)), ch = Math.max(4, Math.round(h * k));
  const ox = new Float32Array(cw * ch), oy = new Float32Array(cw * ch), rim = new Float32Array(cw * ch);
  const hw = w / 2, hh = h / 2;
  let maxo = 0.5;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = (x + .5) / k - hw, py = (y + .5) / k - hh;
      const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
      let nx, ny;
      if (qx > 0 && qy > 0) { const L = Math.hypot(qx, qy) || 1; nx = qx / L; ny = qy / L; }
      else if (qx > qy) { nx = 1; ny = 0; } else { nx = 0; ny = 1; }
      nx *= Math.sign(px) || 1; ny *= Math.sign(py) || 1;
      const t = Math.min(Math.max(-sd / bezel, 0), 1);
      const m = Math.pow(1 - t, 2.2);
      let dx = -nx * m * refract, dy = -ny * m * refract;
      if (mag) { dx -= px * mag; dy -= py * mag; }
      const i = y * cw + x; ox[i] = dx; oy[i] = dy; rim[i] = Math.pow(1 - t, 1.15);
      const a = Math.max(Math.abs(dx), Math.abs(dy)); if (a > maxo) maxo = a;
    }
  }
  const S = maxo * 2;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(cw, ch), d = img.data;
  for (let i = 0; i < cw * ch; i++) {
    d[i * 4] = Math.round((.5 + ox[i] / S) * 255);
    d[i * 4 + 1] = Math.round((.5 + oy[i] / S) * 255);
    d[i * 4 + 2] = Math.round(rim[i] * 255); d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { url: cv.toDataURL('image/png'), scale: S };
}

function el(tag, attrs, parent) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

function glassify(node) {
  if (!REFRACT) return;
  const w = node.offsetWidth, h = node.offsetHeight;
  if (w < 4 || h < 4) return;
  if (node._lgSize === w + 'x' + h) return;
  node._lgSize = w + 'x' + h;
  const r = Math.min(parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0, w / 2, h / 2);
  const bezel = +node.dataset.bezel || 24, refract = +node.dataset.refract || 16, mag = +node.dataset.mag || 0;
  const chroma = node.dataset.chroma === '1';
  const blur = node.dataset.blur != null ? +node.dataset.blur : (mag ? .4 : 1.6);
  const map = buildMap(w, h, r, bezel, refract, mag);
  const id = node._lgId || (node._lgId = 'lg' + (++lgCount));
  let f = document.getElementById(id);
  if (f) f.remove();
  f = el('filter', { id, x: 0, y: 0, width: w, height: h, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, defs);
  const im = el('feImage', { x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none', result: 'map' }, f);
  im.setAttribute('href', map.url); im.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', map.url);
  if (chroma) {
    const ch = [['r', 1.06, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['g', 1, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['b', .94, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']];
    for (const [c, s, mtx] of ch) {
      el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: (map.scale * s).toFixed(2), xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + c }, f);
      el('feColorMatrix', { in: 'd' + c, type: 'matrix', values: mtx, result: 'c' + c }, f);
    }
    el('feBlend', { in: 'cr', in2: 'cg', mode: 'screen', result: 'rg' }, f);
    el('feBlend', { in: 'rg', in2: 'cb', mode: 'screen', result: 'disp' }, f);
  } else {
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: map.scale.toFixed(2), xChannelSelector: 'R', yChannelSelector: 'G', result: 'disp' }, f);
  }
  // Frosted panels: a sharp, refracted rim over a softly blurred centre (the rim weight lives in the map's blue channel).
  const frosted = blur >= 3 && !mag;
  if (frosted) {
    el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: blur, edgeMode: 'duplicate', result: 'frost' }, f);
    el('feColorMatrix', { in: 'map', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0', result: 'rim' }, f);
    el('feComposite', { in: 'disp', in2: 'rim', operator: 'in', result: 'edge' }, f);
    el('feComposite', { in: 'edge', in2: 'frost', operator: 'over' }, f);
  }
  const bf = frosted ? `url(#${id}) saturate(1.6) brightness(1.04)` : `url(#${id}) blur(${blur}px) saturate(1.7) brightness(1.04)`;
  node.style.backdropFilter = bf;
  node.style.webkitBackdropFilter = bf;
}
const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => es.forEach(e => glassify(e.target))) : null;
function initGlass() { $$('.lg').forEach(n => { glassify(n); ro && ro.observe(n); }); }

// specular highlight follows the pointer across glass
document.addEventListener('pointermove', e => {
  const g = e.target.closest && e.target.closest('.glass, .lg');
  if (!g) return;
  const b = g.getBoundingClientRect();
  g.style.setProperty('--mx', ((e.clientX - b.left) / b.width * 100).toFixed(1) + '%');
  g.style.setProperty('--my', ((e.clientY - b.top) / b.height * 100).toFixed(1) + '%');
}, { passive: true });

/* ======================= Rolling numbers ======================= */
const isD = c => c >= '0' && c <= '9';
const STRIP = '<span>&nbsp;</span>' + '0123456789'.split('').map(d => `<span>${d}</span>`).join('');
function roll(node, text, instant) {
  const old = node._txt != null ? node._txt : node.textContent.trim();
  node._txt = text;
  node.setAttribute('aria-label', text);
  node.textContent = '';
  const cols = [], n = text.length, o = old.length;
  for (let i = 0; i < n; i++) {
    const c = text[i], oc = old[o - n + i];
    if (isD(c)) {
      const col = document.createElement('span'); col.className = 'rc'; col.setAttribute('aria-hidden', 'true');
      const s = document.createElement('span'); s.className = 'rs'; s.innerHTML = STRIP; col.appendChild(s); node.appendChild(col);
      const from = isD(oc || '') ? +oc + 1 : 0;
      col.style.setProperty('--w', from ? '1ch' : '0ch'); s.style.setProperty('--d', from);
      cols.push([col, s, +c + 1]);
    } else {
      const s = document.createElement('span'); s.className = c === '%' ? 'rch u' : 'rch'; s.setAttribute('aria-hidden', 'true'); s.textContent = c; node.appendChild(s);
    }
  }
  const settle = () => cols.forEach(([col, s, to], j) => { col.style.setProperty('--w', '1ch'); s.style.transitionDelay = instant ? '0ms' : (j * 45) + 'ms'; s.style.setProperty('--d', to); });
  if (instant || reduced) { cols.forEach(([col, s]) => { col.style.transition = 'none'; s.style.transition = 'none'; }); settle(); node.offsetWidth; cols.forEach(([col, s]) => { col.style.transition = ''; s.style.transition = ''; }); return; }
  node.offsetWidth;
  requestAnimationFrame(() => requestAnimationFrame(settle));
}

/* ======================= Segmented control helper ======================= */
function segSet(seg, k, animate = true) {
  const btns = $$('button', seg), thumb = $('.thumb', seg);
  btns.forEach((b, i) => b.setAttribute('aria-pressed', i === k ? 'true' : 'false'));
  const prev = +(thumb.style.getPropertyValue('--k') || 0);
  thumb.style.setProperty('--k', k);
  if (animate && prev !== k && !reduced) { thumb.classList.remove('squish'); thumb.offsetWidth; thumb.classList.add('squish'); }
}

/* ======================= Data (from the report) ======================= */
const MODELS = [
  { n: 'XGBoost', f: 'boost', ap: .4716, pr: .4797, re: .5236, f1: .5007, c20: 62.57 },
  { n: 'CatBoost', f: 'boost', ap: .4606, pr: .4710, re: .5378, f1: .5022, c20: 63.42 },
  { n: 'Random forest', f: 'tree', ap: .4551, pr: .4448, re: .5520, f1: .4926, c20: 63.04 },
  { n: 'AdaBoost', f: 'boost', ap: .4445, pr: .4764, re: .4953, f1: .4856, c20: 61.06 },
  { n: 'MLP', f: 'tree', ap: .4428, pr: .4748, re: .4811, f1: .4779, c20: 60.11 },
  { n: 'TabTransformer', f: 'tree', ap: .4375, pr: .4465, re: .5132, f1: .4776, c20: 59.64 },
  { n: 'Linear SVM', f: 'trad', ap: .4115, pr: .4812, re: .4234, f1: .4505, c20: 55.20 },
  { n: 'Logistic regression', f: 'trad', ap: .4111, pr: .4595, re: .4395, f1: .4493, c20: 55.67 },
  { n: 'k-nearest neighbours', f: 'trad', ap: .4079, pr: .4045, re: .4962, f1: .4457, c20: 57.66 }
];
const FAM = { trad: 'var(--c-trad)', tree: 'var(--c-tree)', boost: 'var(--c-boost)' };
const f4 = v => v.toFixed(4), pct = v => v.toFixed(2) + '%';
const METRICS = [
  { k: 'ap', fmt: f4, eyebrow: 'Average precision · ranking', head: 'XGBoost ranks subscribers best', body: 'AP 0.4716, against 0.4111 for logistic regression. The three tree ensembles take the top three places.' },
  { k: 'f1', fmt: f4, eyebrow: 'F1 · balanced yes/no calls', head: 'CatBoost strikes the best balance', body: 'F1 0.5022 at its training-selected threshold of 0.20, just ahead of XGBoost at 0.5007.' },
  { k: 're', fmt: f4, eyebrow: 'Recall · subscribers found', head: 'Random forest finds the most subscribers', body: '584 of the 1,058 subscribers found, at the cost of 729 customers flagged who did not subscribe.' },
  { k: 'pr', fmt: f4, eyebrow: 'Precision · hit rate of the calls', head: 'The linear SVM is the most selective', body: '48.1% of the customers it flags subscribe, but it finds only 42.3% of all subscribers.' },
  { k: 'c20', fmt: pct, eyebrow: 'Capture · top 20% of the list', head: 'With a 20% budget, CatBoost reaches the most', body: '63.42% of all subscribers sit in its top 1,808 customers, ahead of random forest (63.04%) and XGBoost (62.57%).' }
];

/* ======================= Slide behaviours ======================= */
const H = {};

// 2 · accuracy trap
H['s-trap'] = (() => {
  const waffle = $('#waffle'), sw = $('#trapSwitch'), acc = $('#trapAcc');
  const r = rng(7), subs = new Set(shuffle(1000, 11).slice(0, 117));
  let html = '';
  for (let i = 0; i < 1000; i++) html += `<i class="dt${subs.has(i) ? ' sub' : ''}" style="--dl:${subs.has(i) ? 180 + Math.round(r() * 720) : 0}ms"></i>`;
  waffle.innerHTML = html;
  waffle.classList.add('lit');
  roll(acc, '0.0%', true);
  sw.addEventListener('click', () => go(curIndex(), stepNow() ? 0 : 1));
  return {
    enter(st) {
      if (st !== 0 || reduced) return;
      waffle.classList.add('reset'); waffle.classList.remove('lit'); waffle.offsetWidth;
      waffle.classList.remove('reset');
      requestAnimationFrame(() => waffle.classList.add('lit'));
    },
    apply(st, instant) { waffle.classList.add('lit'); waffle.classList.toggle('missed', st >= 1); sw.setAttribute('aria-checked', st >= 1 ? 'true' : 'false'); roll(acc, st >= 1 ? '88.3%' : '0.0%', instant); } };
})();

// 3 · timeline
H['s-data'] = { apply(st) { $('#post').classList.toggle('cut', st >= 1); } };

// 6 · metric switcher
H['s-results'] = (() => {
  const seg = $('#metricSeg'), bars = $('#bars'), tip = $('#barTip'), ins = $('#insight');
  const ROW = 50, NAME = 210, MAXW = 520;
  const rows = MODELS.map((m, i) => {
    const r = document.createElement('div'); r.className = 'brow';
    r.innerHTML = `<span class="nm">${m.n}</span><span class="tk"><span class="fill" style="--c:${FAM[m.f]}"></span><span class="val"><span class="v"></span><span class="best">Best</span></span></span>`;
    bars.appendChild(r);
    r.addEventListener('pointerenter', () => {
      tip.innerHTML = `<b>${m.n}</b><br>AP ${f4(m.ap)} · F1 ${f4(m.f1)}<br>Recall ${f4(m.re)} · Precision ${f4(m.pr)}<br>Top-20% capture ${pct(m.c20)}`;
      tip.style.left = (96 + NAME) + 'px'; tip.style.top = (330 + r._rank * ROW - 118) + 'px'; tip.classList.add('show');
    });
    r.addEventListener('pointerleave', () => tip.classList.remove('show'));
    return r;
  });
  $$('button', seg).forEach((b, i) => b.addEventListener('click', () => go(curIndex(), i)));
  $('.base', bars).style.left = NAME + 'px';
  let shown = -1;
  function setInsight(M, win, instant) {
    const put = () => { $('#insEyebrow').textContent = M.eyebrow; $('#insHead').textContent = M.head; $('#insBody').textContent = M.body; $('#insWho').textContent = win.n; };
    roll($('#insNum'), M.fmt(win[M.k]), instant);
    if (instant || reduced) { put(); return; }
    ins.classList.add('out'); setTimeout(() => { put(); ins.classList.remove('out'); }, 260);
  }
  let pulseT = 0;
  return {
    enter(st) {
      if (reduced) return;
      rows.forEach(r => { const f = $('.fill', r), v = $('.val', r); f.style.transition = 'none'; v.style.transition = 'none'; f.style.width = '0px'; v.style.left = '14px'; v.style.opacity = '0'; });
      bars.offsetWidth;
      rows.forEach(r => { $('.fill', r).style.transition = ''; $('.val', r).style.transition = ''; });
      setTimeout(() => { this.apply(st, false, true); rows.forEach(r => { $('.val', r).style.opacity = ''; }); }, 160);
    },
    apply(st, instant, grow) {
      const M = METRICS[st];
      segSet(seg, st, !instant);
      const vals = MODELS.map(m => m[M.k]);
      const max = Math.max(...vals);
      const order = MODELS.map((m, i) => i).sort((a, b) => vals[b] - vals[a] || a - b);
      order.forEach((mi, rank) => {
        const r = rows[mi]; r._rank = rank;
        r.style.transform = `translateY(${rank * ROW}px)`;
        const w = vals[mi] / max * MAXW;
        const dl = grow ? rank * 55 + 'ms' : '0ms';
        $('.fill', r).style.transitionDelay = dl; $('.val', r).style.transitionDelay = dl;
        $('.fill', r).style.width = w + 'px';
        $('.val', r).style.left = (w + 14) + 'px';
        $('.v', r).textContent = M.fmt(vals[mi]);
        r.classList.toggle('win', rank === 0);
        r.setAttribute('aria-label', `${MODELS[mi].n}: ${M.fmt(vals[mi])}`);
      });
      if (shown !== st) setInsight(M, MODELS[order[0]], instant || shown === -1);
      shown = st;
      clearTimeout(pulseT);
      rows.forEach(r => r.classList.remove('pulse'));
      if (!instant && !reduced) pulseT = setTimeout(() => { const w = rows[order[0]]; w.offsetWidth; w.classList.add('pulse'); }, grow ? 900 : 560);
    }
  };
})();

// 7 · neural vs forest charts
H['s-nn'] = (() => {
  // dot plot of test AP
  const W = 700, ROW = 46, top = 12, x0 = 214, x1 = 680, lo = .40, hi = .48;
  const X = v => x0 + (v - lo) / (hi - lo) * (x1 - x0);
  const HL = new Set(['Random forest', 'MLP', 'TabTransformer']);
  const Hh = top + MODELS.length * ROW + 36;
  let s = `<svg class="chart-svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Test average precision for the nine models">`;
  s += `<text class="tick" x="0" y="0" dy="-2" style="font-size:13px;letter-spacing:.12em">TEST AVERAGE PRECISION</text>`;
  for (let t = 0; t <= 4; t++) { const v = lo + t * .02, x = X(v); s += `<line class="grid" x1="${x}" x2="${x}" y1="${top + 6}" y2="${top + MODELS.length * ROW}"/><text class="tick" x="${x}" y="${top + MODELS.length * ROW + 24}" text-anchor="middle">${v.toFixed(2)}</text>`; }
  MODELS.forEach((m, i) => {
    const y = top + i * ROW + ROW / 2, x = X(m.ap), h = HL.has(m.n);
    s += `<text class="rowlab${h ? ' hi' : ''}" x="0" y="${y}" dy="6">${m.n}</text>`;
    s += `<line class="stem" pathLength="1" style="--k:${i}" x1="${x0}" x2="${x}" y1="${y}" y2="${y}"/>`;
    s += `<circle class="dot" cx="${x}" cy="${y}" r="7.5" style="--k:${i};fill:${FAM[m.f]};opacity:${h ? 1 : .32}"/>`;
    if (h) s += `<text class="vlab" style="--k:${i}" x="${x + 16}" y="${y}" dy="5">${f4(m.ap)}</text>`;
  });
  s += '</svg>';
  $('#apPlot').innerHTML = s;
  // bootstrap intervals
  const CI = [['MLP − Random forest', -.0124, -.0247, -.0011], ['TabTransformer − Random forest', -.0176, -.0290, -.0058], ['TabTransformer − MLP', -.0052, -.0165, .0067]];
  const CW = 588, CR = 80, ct = 24, cl = -.034, ch = .012, CX = v => 8 + (v - cl) / (ch - cl) * (CW - 16);
  const CH = ct + CI.length * CR + 26;
  let c = `<svg class="chart-svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="Bootstrap differences in average precision">`;
  [-.03, -.02, -.01, 0, .01].forEach(v => { const x = CX(v); c += `<line class="${v === 0 ? 'zero' : 'grid'}" x1="${x}" x2="${x}" y1="${ct - 8}" y2="${ct + CI.length * CR - 10}"/><text class="tick" x="${x}" y="${CH - 4}" text-anchor="middle">${v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2)}</text>`; });
  CI.forEach(([lab, d, a, b], i) => {
    const y = ct + i * CR + 44, sig = b < 0, col = sig ? 'var(--c-tree)' : 'var(--ink-3)';
    c += `<text class="rowlab${sig ? ' hi' : ''}" x="8" y="${y - 22}">${lab}</text>`;
    c += `<text class="vlab" x="${CW - 8}" y="${y - 22}" text-anchor="end">${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(4)}</text>`;
    c += `<line x1="${CX(a)}" x2="${CX(b)}" y1="${y}" y2="${y}" style="stroke:${col};stroke-width:3;stroke-linecap:round"/>`;
    c += `<line x1="${CX(a)}" x2="${CX(a)}" y1="${y - 7}" y2="${y + 7}" style="stroke:${col};stroke-width:2"/><line x1="${CX(b)}" x2="${CX(b)}" y1="${y - 7}" y2="${y + 7}" style="stroke:${col};stroke-width:2"/>`;
    c += `<circle cx="${CX(d)}" cy="${y}" r="7" style="fill:${sig ? col : 'var(--bg)'};stroke:${col};stroke-width:2"/>`;
  });
  c += '</svg>';
  $('#ciPlot').innerHTML = c;
  const ap = $('#apPlot');
  return { enter() { ap.classList.remove('anim'); ap.offsetWidth; ap.classList.add('anim'); } };
})();

// 8 · budget
H['s-budget'] = (() => {
  const field = $('#field'), seg = $('#budgetSeg');
  const order = shuffle(1058, 23), pos = new Array(1058);
  order.forEach((idx, p) => { pos[idx] = p; });
  let html = ''; for (let i = 0; i < 1058; i++) html += '<i class="dt"></i>';
  field.innerHTML = html;
  const dots = $$('.dt', field);
  const S = [
    { calls: '904', k: 0, mode: '', r: '–', rs: '', m: '–', ms: '', seg: 0 },
    { calls: '904', k: 106, mode: 'lit-r', r: '106', rs: 'About 10% of subscribers', m: '–', ms: '', seg: 0 },
    { calls: '904', k: 475, mode: 'lit-m', r: '106', rs: 'About 10% of subscribers', m: '475', ms: '44.90% of subscribers · 4.5× random', seg: 0 },
    { calls: '1,808', k: 662, mode: 'lit-m', r: '212', rs: 'About 20% of subscribers', m: '662', ms: '62.57% of subscribers · 3.1× random', seg: 1 }
  ];
  let lastK = 0;
  $$('button', seg).forEach((b, i) => b.addEventListener('click', () => {
    if (i === 1) go(curIndex(), 3);
    else if (stepNow() === 3) go(curIndex(), 2);
  }));
  return {
    apply(st, instant) {
      const s = S[st];
      segSet(seg, s.seg, !instant);
      const span = Math.max(1, s.k);
      dots.forEach((d, i) => {
        const p = pos[i], lit = p < s.k;
        const want = lit ? 'dt ' + s.mode : 'dt';
        if (d.className !== want) {
          d.style.setProperty('--dl', (instant || !lit) ? '0ms' : Math.round(p / span * 900) + 'ms');
          d.className = want;
        }
      });
      lastK = s.k;
      roll($('#callsN'), s.calls, instant);
      const rn = $('#randN'), mn = $('#modelN');
      roll(rn, s.r, instant); rn.classList.toggle('dim', s.r === '–');
      roll(mn, s.m, instant); mn.classList.toggle('dim', s.m === '–');
      $('#randSub').innerHTML = s.rs || '&nbsp;';
      $('#modelSub').innerHTML = s.ms || '&nbsp;';
    }
  };
})();

// 9 · SHAP lens
H['s-shap'] = (() => {
  const box = $('.s-shap .shap'), lens = $('#lens'), band = $('#band'), feat = $('#feat'), items = $$('.s-shap .fi');
  // the 15 encoded features in the figure's order, with their row centres in the original 716px-tall image
  const F = [['Contact method unknown', 47], ['Day of month', 90], ['Previous campaign: success', 131], ['Contacted by mobile', 172],
    ['Account balance', 213], ['No housing loan', 256], ['Calls this campaign', 300], ['Married', 338], ['Month: June', 380],
    ['Age', 423], ['Days since last contact', 465], ['Month: April', 506], ['Month: October', 546], ['Month: February', 588], ['No personal loan', 631]];
  const SC = 560 / 716, FOCUS = [2, 0, 6];
  feat.innerHTML = F.map(([n, y]) => `<li style="top:${(y * SC).toFixed(1)}px">${n}</li>`).join('');
  const lis = $$('li', feat);
  return {
    apply(st) {
      const on = st >= 1, k = FOCUS[Math.max(0, st - 1)], y = F[k][1] * SC;
      box.classList.toggle('focus', on);
      lens.classList.toggle('on', on);
      lis.forEach((li, i) => li.classList.toggle('on', on && i === k));
      band.style.setProperty('--y', y + 'px');
      lens.style.transform = `translateY(${y - 24}px)`;
      items.forEach((it, i) => it.classList.toggle('past', st > i + 1));
    }
  };
})();

// 10 · duration
H['s-duration'] = (() => {
  const sw = $('#durSwitch'), tiles = $('#durTiles');
  const V = { ap: [.4716, .6202, f4, '+0.1486'], roc: [.8077, .9315, f4, '+0.1238'], c10: [44.90, 55.39, pct, '+10.49 pts'], c20: [62.57, 82.04, pct, '+19.47 pts'] };
  sw.addEventListener('click', () => go(curIndex(), stepNow() ? 0 : 1));
  return {
    enter(st) {
      if (st !== 0 || reduced) return;
      $$('[data-k]', tiles).forEach(n => {
        const text = n._txt, bar = n.parentElement.querySelector('.mb i'), v = bar.style.getPropertyValue('--v');
        roll(n, text.replace(/[0-9]/g, '0'), true);
        bar.style.transition = 'none'; bar.style.setProperty('--v', '0%'); bar.offsetWidth; bar.style.transition = '';
        setTimeout(() => { roll(n, text); bar.style.setProperty('--v', v); }, 260);
      });
    },
    apply(st, instant) {
      const on = st >= 1;
      sw.setAttribute('aria-checked', on ? 'true' : 'false');
      $$('[data-k]', tiles).forEach(n => {
        const v = V[n.dataset.k], val = on ? v[1] : v[0];
        roll(n, v[2](val), instant);
        const frac = n.dataset.k.startsWith('c') ? val : val * 100;
        n.parentElement.querySelector('.mb i').style.setProperty('--v', frac + '%');
      });
      $$('[data-d]', tiles).forEach(n => { n.textContent = on ? V[n.dataset.d][3] : ' '; });
      tiles.classList.toggle('dim', st >= 2);
    }
  };
})();

/* ======================= Navigation ======================= */
const app = $('#app'), stage = $('#stage'), wrap = $('#stageWrap'), viewport = $('#viewport');
const slides = $$('.slide', stage), N = slides.length;
const STEPS = slides.map(s => +s.dataset.steps || 1);
const handler = s => { for (const c of s.classList) if (H[c]) return H[c]; return null; };
let cur = 0, step = 0, started = false, slideStart = 0;
const curIndex = () => cur, stepNow = () => step;

function applyStep(si, st, instant) {
  const s = slides[si];
  $$('[data-at]', s).forEach(n => { const only = n.dataset.only; n.classList.toggle('on', only != null ? st === +only : st >= +n.dataset.at); });
  const h = handler(s); if (h && h.apply) h.apply(st, instant);
}

function go(si, st, opts = {}) {
  si = Math.max(0, Math.min(N - 1, si)); st = Math.max(0, Math.min(STEPS[si] - 1, st));
  if (!started && !opts.instant && (si !== 0 || st !== 0)) startTimer();
  if (si === cur && !opts.force) { step = st; applyStep(cur, step, false); chrome(); return; }
  const dir = si >= cur ? 1 : -1, old = slides[cur], nw = slides[si];
  if (old !== nw) {
    clearTimeout(old._t);
    old.classList.remove('active', 'entering', 'back');
    if (!opts.instant) { old.classList.add('leaving'); old.classList.toggle('back', dir < 0); old._t = setTimeout(() => old.classList.remove('leaving', 'back'), 340); }
  }
  clearTimeout(nw._t); nw.classList.remove('leaving', 'back', 'entering');
  applyStep(si, st, true);
  nw.classList.add('active');
  if (!opts.instant) { nw.offsetWidth; nw.classList.add('entering'); nw.classList.toggle('back', dir < 0); nw._t = setTimeout(() => nw.classList.remove('entering', 'back'), 1300); }
  cur = si; step = st; slideStart = performance.now();
  app.classList.toggle('on-cover', nw.classList.contains('s-cover'));
  const hh = handler(nw); if (!opts.instant && hh && hh.enter) hh.enter(st);
  chrome();
}
const next = () => step < STEPS[cur] - 1 ? go(cur, step + 1) : (cur < N - 1 && go(cur + 1, 0));
const prev = () => step > 0 ? go(cur, step - 1) : (cur > 0 && go(cur - 1, STEPS[cur - 1] - 1));

/* ======================= Chrome: dock, notes, timer ======================= */
const count = $('#count'), pips = $('#pips');
function chrome() {
  count.textContent = `${pad2(cur + 1)} / ${pad2(N)}`;
  const n = STEPS[cur];
  pips.innerHTML = n > 1 ? Array.from({ length: n }, (_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('') : '';
  pips.hidden = n <= 1;
  renderNotes(document);
  if (popup && !popup.closed) renderNotes(popup.document);
  if (typeof publishState === 'function') publishState();
}

const TOTAL = NOTES.reduce((a, n) => a + n.t, 0);
let t0 = 0, timerIv = 0;
function startTimer() { started = true; t0 = performance.now(); slideStart = t0; clearInterval(timerIv); timerIv = setInterval(tick, 500); tick(); }
function tick() {
  [document, popup && !popup.closed ? popup.document : null].forEach(doc => {
    if (!doc) return;
    const el = doc.getElementById('timer'); if (!el) return;
    const e = started ? (performance.now() - t0) / 1000 : 0, se = started ? (performance.now() - slideStart) / 1000 : 0;
    el.textContent = mmss(e).padStart(5, '0');
    el.classList.toggle('over', e > TOTAL);
    const bar = doc.getElementById('tBar'); bar.style.width = Math.min(100, e / TOTAL * 100) + '%'; bar.classList.toggle('over', e > TOTAL);
    doc.getElementById('nPace').textContent = `THIS SLIDE ${mmss(se)} / ${mmss(NOTES[cur].t)}`;
  });
}
function renderNotes(doc) {
  const body = doc.getElementById('nBody'); if (!body) return;
  doc.getElementById('nSlide').textContent = `SLIDE ${pad2(cur + 1)} / ${pad2(N)}`;
  doc.getElementById('tTarget').textContent = `TARGET ${mmss(TOTAL)}`;
  doc.getElementById('nTitle').textContent = slides[cur].dataset.title;
  const p = NOTES[cur].p;
  body.innerHTML = p.map((t, k) => `<p class="seg-p ${k < step ? 'done' : k === step ? 'now' : ''}">${k ? '<span class="kbd">→ ' + k + '</span>' : ''}${t}</p>`).join('');
  const now = body.querySelector('.now'); if (now) body.scrollTop = Math.max(0, now.offsetTop - body.offsetTop - 12);
  doc.getElementById('nNext').textContent = cur < N - 1 ? 'Next: ' + slides[cur + 1].dataset.title : 'Last slide';
  tick();
}
function toggleNotes(force) {
  const open = force != null ? force : !app.classList.contains('notes-open');
  app.classList.toggle('notes-open', open);
  $('#bNotes').setAttribute('aria-pressed', open ? 'true' : 'false');
  if (open && !started) { /* timer starts on first advance */ }
  fit();
}
$('#timer').addEventListener('click', () => startTimer());

let popup = null;
$('#popOut').addEventListener('click', () => {
  let w = null;
  try { w = window.open('', 'mh6805-speaker-notes', 'popup,width=760,height=860'); } catch (e) { w = null; }
  if (!w) { $('#popOut').textContent = 'New windows are blocked here'; setTimeout(() => { $('#popOut').textContent = 'Open in new window'; }, 2600); return; }
  popup = w;
  const css = $$('style').map(s => s.textContent).join('\n');
  w.document.open();
  w.document.write(`<!doctype html><html${effectiveDark() ? ' data-deck="dark"' : ''}><head><meta charset="utf-8"><title>Speaker notes</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap"><style>${css}
    body{overflow:hidden} .notes{inset:0!important;width:auto!important;max-width:none!important;transform:none!important;border-radius:0!important;top:0;bottom:0;right:0;left:0;box-shadow:none} .notes .seg-p{font-size:22px} .notes h2{font-size:24px}</style></head>
    <body>${$('#notes').outerHTML.replace('id="popOut"', 'id="popOutX" hidden')}</body></html>`);
  w.document.close();
  w.document.addEventListener('keydown', onKey);
  w.document.getElementById('timer').addEventListener('click', () => startTimer());
  renderNotes(w.document);
  toggleNotes(false);
});
window.addEventListener('beforeunload', () => { try { popup && popup.close(); } catch (e) {} });

/* ======================= Phone remote ======================= */
// Deck and phone talk through a public pub/sub relay (ntfy.sh): the phone posts commands,
// the deck posts its position back. Each pairing uses a random code as the topic name.
const RELAY = new URLSearchParams(location.search).get('relay') || 'https://ntfy.sh';
const PUBLIC_URL = 'https://mh6805-presentatio.vercel.app';
const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let room = null, es = null, pubT = 0, phoneSeen = false;
const pair = $('#pair');
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const topic = () => 'mh6805deck-' + room;
function remoteUrl() {
  const local = location.protocol === 'file:' || /claude|localhost|127\.0\.0\.1/.test(location.hostname) && !new URLSearchParams(location.search).get('relay');
  const base = local ? PUBLIC_URL : location.origin;
  const rel = new URLSearchParams(location.search).get('relay');
  return `${base}/remote?room=${room}` + (rel ? `&relay=${encodeURIComponent(rel)}` : '');
}
function setPairStatus(kind, text) {
  const st = $('#pairStatus'); st.classList.toggle('ok', kind === 'ok'); st.classList.toggle('bad', kind === 'bad');
  st.querySelector('span').textContent = text;
}
function connectRemote() {
  if (es) return;
  room = room || store.get('mh6805-room') || newCode();
  store.set('mh6805-room', room); store.set('mh6805-remote', '1');
  try { es = new EventSource(`${RELAY}/${topic()}/sse`); } catch (e) { setPairStatus('bad', 'The relay is not reachable from this page.'); return; }
  let opened = false;
  es.onopen = () => { opened = true; setPairStatus(phoneSeen ? 'ok' : '', phoneSeen ? 'Phone connected' : 'Waiting for your phone…'); publishState(); };
  es.onerror = () => { setPairStatus('bad', opened ? 'Relay connection dropped. Retrying…' : (location.hostname.endsWith('vercel.app') ? 'This computer cannot reach the relay (network or firewall).' : `Can't reach the relay here. Use ${PUBLIC_URL.replace('https://', '')}`)); };
  es.onmessage = ev => {
    let j, m; try { j = JSON.parse(ev.data); m = JSON.parse(j.message); } catch (e) { return; }
    if (j.event && j.event !== 'message') return;
    if (!m || m.t !== 'cmd') return;
    if (!phoneSeen) { phoneSeen = true; setPairStatus('ok', 'Phone connected'); }
    if (m.a === 'next') next();
    else if (m.a === 'prev') prev();
    else if (m.a === 'go') go(+m.s || 0, +m.st || 0);
    if (m.a === 'hello') publishState(); else wake();
  };
}
function disconnectRemote() { if (es) { es.close(); es = null; } phoneSeen = false; }
function publishState() {
  if (!es) return;
  clearTimeout(pubT);
  pubT = setTimeout(() => {
    fetch(`${RELAY}/${topic()}`, { method: 'POST', body: JSON.stringify({ t: 'state', cur, step, n: N, steps: STEPS }) })
      .then(r => { if (!r.ok) setPairStatus('bad', `Relay refused the update (HTTP ${r.status}).`); })
      .catch(() => setPairStatus('bad', 'This computer cannot send to the relay (network or firewall).'));
  }, 80);
}
let qrLoaded = null;
function drawQr(url) {
  const box = $('#qr'); box.innerHTML = ''; box.classList.remove('none');
  const draw = () => { try { new window.QRCode(box, { text: url, width: 168, height: 168, colorDark: '#0D1016', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M }); } catch (e) { box.classList.add('none'); } };
  if (window.QRCode) return draw();
  qrLoaded = qrLoaded || new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  qrLoaded.then(draw, () => box.classList.add('none'));
}
function togglePair(force) {
  const open = force != null ? force : pair.hidden;
  pair.hidden = !open;
  $('#bRemote').setAttribute('aria-pressed', open ? 'true' : 'false');
  if (open) {
    connectRemote();
    $('#pairCode').textContent = room.toUpperCase();
    const url = remoteUrl();
    $('#pairUrl').textContent = url.replace(/^https?:\/\//, '');
    drawQr(url);
  }
}
$('#bRemote').addEventListener('click', () => togglePair());
$('#pairClose').addEventListener('click', () => togglePair(false));
pair.addEventListener('click', e => { if (e.target === pair) togglePair(false); });
$('#pairNew').addEventListener('click', () => { disconnectRemote(); room = newCode(); store.set('mh6805-room', room); togglePair(true); });
if (store.get('mh6805-remote') === '1') connectRemote();
setInterval(() => { if (es && es.readyState === 1) publishState(); }, 15000);

/* ======================= Theme, full screen, help ======================= */
const root = document.documentElement;
const effectiveDark = () => root.dataset.deck === 'dark';
function toggleTheme() {
  if (effectiveDark()) delete root.dataset.deck; else root.dataset.deck = 'dark';
  if (popup && !popup.closed) { if (effectiveDark()) popup.document.documentElement.dataset.deck = 'dark'; else delete popup.document.documentElement.dataset.deck; }
}
function toggleFull() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
  } catch (e) {}
}
const help = $('#help');
const toggleHelp = force => { help.hidden = force != null ? !force : !help.hidden; };
help.addEventListener('click', () => toggleHelp(false));

$('#bPrev').addEventListener('click', prev);
$('#bNext').addEventListener('click', next);
$('#bNotes').addEventListener('click', () => toggleNotes());
$('#bTheme').addEventListener('click', toggleTheme);
$('#bFull').addEventListener('click', toggleFull);
// a mouse click should not leave focus on a button, or the next Space would press it again
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b && e.detail > 0) b.blur(); });

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) { e.preventDefault(); next(); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
  else if (k === 'Home') { e.preventDefault(); go(0, 0); }
  else if (k === 'End') { e.preventDefault(); go(N - 1, 0); }
  else if (k === 's' || k === 'S') toggleNotes();
  else if (k === 'r' || k === 'R') togglePair();
  else if (k === 't' || k === 'T') toggleTheme();
  else if (k === 'f' || k === 'F') toggleFull();
  else if (k === '?') toggleHelp();
  else if (k === 'Escape') { if (!pair.hidden) togglePair(false); else if (!help.hidden) toggleHelp(false); else if (app.classList.contains('notes-open')) toggleNotes(false); }
  wake();
}
document.addEventListener('keydown', onKey);

// swipe on touch screens
let sx = null, sy = null;
stage.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { sx = e.clientX; sy = e.clientY; } });
stage.addEventListener('pointerup', e => {
  if (sx == null) return;
  const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
});

// the dock fades out while presenting and returns when the pointer moves
let idleT = 0;
function wake() { app.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => { if (started && !$('#dock').matches(':hover')) app.classList.add('idle'); }, 2600); }
document.addEventListener('pointermove', wake, { passive: true });

/* ======================= Fit the stage ======================= */
function fit() {
  const cs = getComputedStyle(viewport);
  const aw = viewport.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ah = viewport.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const s = Math.max(.05, Math.min(aw / 1600, ah / 900));
  wrap.style.width = 1600 * s + 'px'; wrap.style.height = 900 * s + 'px';
  stage.style.transform = `scale(${s})`;
}
addEventListener('resize', fit);

function fitTitles() {
  $$('.cover-title').forEach(t => {
    t.style.fontSize = '';
    const over = t.scrollWidth / Math.max(1, t.clientWidth);
    if (over > 1) t.style.fontSize = (parseFloat(getComputedStyle(t).fontSize) / over * .98).toFixed(1) + 'px';
  });
}

/* ======================= Boot ======================= */
fit();
fitTitles();
app.classList.add('on-cover');
const m = /^#s(\d+)(?:-(\d+))?$/.exec(location.hash || '');
const s0 = m ? Math.min(N, Math.max(1, +m[1])) - 1 : 0, st0 = m && m[2] ? +m[2] : 0;
slides[0].classList.add('active'); cur = 0;
applyStep(0, 0, true);
if (s0 || st0) go(s0, st0, { instant: true, force: true });
chrome();
wake();
initGlass();
addEventListener('hashchange', () => {
  const h = /^#s(\d+)(?:-(\d+))?$/.exec(location.hash || '');
  if (h) go(Math.min(N, Math.max(1, +h[1])) - 1, h[2] ? +h[2] : 0, { instant: true, force: true });
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitTitles(); $$('.lg').forEach(n => { n._lgSize = null; glassify(n); }); });
window.__deck = { go, next, prev, get state() { return { cur, step }; } };
})();
