/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node tool, run outside the app (see CLAUDE.md → Docs) */
// Captures docs screenshots (en + uk) and the boxes of annotated elements.
// Output: out/<name>.<lang>.png + out/shots.json
const fs = require('fs');
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:3100';
const OUT = __dirname + '/out';
fs.mkdirSync(OUT, { recursive: true });
const result = {};

const HELPERS = () => {
  // Deepest element (in document order chain) whose text includes `text` (case-insensitive).
  window.__find = (text, sel = 'body *', root = document) => {
    const t = text.toLowerCase();
    let best = null;
    for (const el of root.querySelectorAll(sel)) {
      if ((el.textContent || '').toLowerCase().includes(t) && (!best || best.contains(el))) best = el;
    }
    return best;
  };
  window.__mark = (key, el) => { if (!el) throw new Error('not found: ' + key); el.setAttribute('data-shot', key); };
};

async function mark(page, marks) {
  // marks: { key: js-expression returning an element }
  for (const [key, expr] of Object.entries(marks)) {
    await page.evaluate(([k, e]) => window.__mark(k, (0, eval)(e)), [key, expr]).catch(err => {
      throw new Error(`mark ${key}: ${err.message}`);
    });
  }
}

async function shoot(page, name, lang, keys, clipFrom, clipTo, pad = 8, hClip = false) {
  const boxes = await page.evaluate(keys => {
    const out = {};
    for (const k of keys) {
      const el = document.querySelector(`[data-shot="${k}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      out[k] = [r.left + scrollX, r.top + scrollY, r.width, r.height];
    }
    return out;
  }, [...new Set([...keys, clipFrom, clipTo].filter(Boolean))]);
  const W = await page.evaluate(() => document.documentElement.clientWidth);
  let y0 = 0, y1 = await page.evaluate(() => document.documentElement.scrollHeight);
  let x0 = 0, x1 = W;
  if (clipFrom) { y0 = Math.max(0, boxes[clipFrom][1] - pad); }
  if (clipTo) { y1 = boxes[clipTo][1] + boxes[clipTo][3] + pad; }
  if (hClip && clipFrom) { x0 = Math.max(0, boxes[clipFrom][0] - pad); x1 = Math.min(W, boxes[clipFrom][0] + boxes[clipFrom][2] + pad); }
  x0 = Math.round(x0); x1 = Math.round(x1);
  const clip = { x: x0, y: y0, width: x1 - x0, height: Math.round(y1 - y0) };
  await page.screenshot({ path: `${OUT}/${name}.${lang}.png`, clip, fullPage: true });
  const rel = {};
  for (const k of keys) {
    const b = boxes[k];
    if (!b) { console.warn('missing box', name, lang, k); continue; }
    rel[k] = [Math.round(b[0] - x0), Math.round(b[1] - y0), Math.round(b[2]), Math.round(b[3])];
  }
  result[name] = result[name] || { w: clip.width, h: clip.height, boxes: {} };
  result[name][lang] = { w: clip.width, h: clip.height, boxes: rel };
  console.log('shot', name, lang, clip.width + 'x' + clip.height, Object.keys(rel).length + '/' + keys.length);
}

async function toggleLang(page) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /UA\s*\|\s*EN/.test(b.textContent));
    b.click();
  });
  await page.waitForTimeout(900);
}

/** Shoot in en, toggle to uk, shoot again (marks survive because React keeps the DOM nodes). */
async function both(page, name, keys, from, to, hClip = false) {
  await shoot(page, name, 'en', keys, from, to, 8, hClip);
  await toggleLang(page);
  await shoot(page, name, 'uk', keys, from, to, 8, hClip);
  await toggleLang(page);
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('dronefly.lang', 'en');
      const now = Date.now();
      sessionStorage.setItem('dronefly.missions.demo', JSON.stringify([{
        id: 'm1', name: 'Recon route', createdAt: now, updatedAt: now, droneId: 'custom_demo', payloadKg: 10,
        airspeedKmh: null, altitudeM: 100, hourIndex: 0, reservePct: 20, mode: 'return',
        points: [{ lat: 50.38, lng: 30.75 }, { lat: 50.43, lng: 30.86 }, { lat: 50.47, lng: 30.95 }],
      }]));
    } catch {}
  });
  await ctx.addInitScript(HELPERS);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 120)));
  const go = async (url, wait = 3500) => {
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(wait);
  };

  // ---------- public dashboard ----------
  await go('/');
  await mark(page, {
    search: `document.querySelector('header input')`,
    geo: `[...document.querySelectorAll('header button')].find(b => /use my location/i.test(b.textContent))`,
    lang: `[...document.querySelectorAll('header button')].find(b => /UA\\s*\\|\\s*EN/.test(b.textContent))`,
    signin: `[...document.querySelectorAll('header button')].find(b => /sign in/i.test(b.textContent))`,
    header: `document.querySelector('header')`,
    map: `document.querySelector('.leaflet-container')`,
    coords: `__find('MGRS 3').parentElement`,
    weather: `document.querySelector('.leaflet-container').closest('.border-r').nextElementSibling`,
    cardsLabel: `__find('current conditions', 'section > div')`,
    card: `(() => { let e = __find('FPV Kamikaze', 'section *'); while (e && e.getBoundingClientRect().height < 100) e = e.parentElement; return e; })()`,
    cards: `__find('current conditions', 'section > div').parentElement`,
    status: `__find('flight status').parentElement`,
    reasons: `[...document.querySelectorAll('*')].find(e => e.children.length > 0 && [...e.children].every(c => c.textContent.trim().startsWith('▶')) && e.closest('section'))`,
    consequences: `__find('consequences').parentElement`,
    sensor: `__find('sensor status').parentElement`,
    thresholds: `__find('// thresholds').parentElement`,
    rose: `__find('wind range impact').parentElement`,
    tlTabs: `__find('48h forecast timeline').nextElementSibling.firstElementChild`,
    tlBars: `__find('48h forecast timeline').nextElementSibling.children[1]`,
    tlSection: `__find('48h forecast timeline').parentElement`,
    windows: `__find('optimal launch windows').closest('section')`,
  });
  await both(page, 'dash-top', ['search', 'geo', 'lang', 'signin', 'map', 'coords', 'weather'], 'header', 'map');
  await both(page, 'dash-cards', ['card', 'status', 'reasons', 'consequences', 'sensor', 'thresholds', 'rose'], 'cardsLabel', 'rose');
  await both(page, 'dash-timeline', ['tlTabs', 'tlBars', 'windows'], 'tlSection', 'windows');

  // ---------- access gate ----------
  for (const lang of ['en', 'uk']) {
    await page.evaluate(l => localStorage.setItem('dronefly.lang', l), lang);
    await go('/zz-shots/gate', 2500);
    await mark(page, {
      gate: `document.querySelector('form').closest('.max-w-lg')`,
      invite: `document.querySelector('form')`,
      request: `document.querySelector('textarea').parentElement`,
    });
    await shoot(page, 'gate', lang, ['invite', 'request'], 'gate', 'gate', 24, true);
  }
  await page.evaluate(() => localStorage.setItem('dronefly.lang', 'en'));

  // ---------- profile + drone form ----------
  await go('/zz-shots/profile', 2500);
  await mark(page, {
    first: `__find('// account').closest('section')`,
    prefs: `__find('// preferences').closest('section')`,
    locations: `__find('saved locations').closest('section')`,
    addLoc: `[...document.querySelectorAll('button')].find(b => /add location/i.test(b.textContent))`,
    drones: `__find('custom drones').closest('section')`,
    droneRow: `__find('custom drones').closest('section').querySelector('li')`,
    addDrone: `[...document.querySelectorAll('button')].find(b => /add drone/i.test(b.textContent))`,
  });
  await both(page, 'profile', ['prefs', 'locations', 'addLoc', 'droneRow', 'addDrone'], 'first', 'drones', true);

  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /add drone/i.test(b.textContent)).click());
  await page.waitForTimeout(600);
  await mark(page, {
    picker: `__find('where do you want to start').closest('.border')`,
    tplFirst: `__find('where do you want to start').closest('.border').querySelector('.grid > button')`,
    tplSpecs: `[...__find('where do you want to start').closest('.border').querySelectorAll('.grid > button')].pop()`,
  });
  await both(page, 'drone-pick', ['tplFirst', 'tplSpecs'], 'picker', 'picker', true);

  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /example: heavy/i.test(b.textContent)).click());
  await page.waitForTimeout(600);
  // Fit the whole form in the viewport so the sticky footer sits at its natural place.
  const fh = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 1440, height: fh + 40 });
  await page.waitForTimeout(500);
  await page.fill('input[data-field="name"]', 'Heavy 15 kg #2');
  await mark(page, {
    form: `document.querySelector('form[novalidate]')`,
    based: `__find('change template').parentElement`,
    sec1: `__find('basics', 'section h3').closest('section')`,
    modes: `__find('flight performance', 'section h3').closest('section').querySelector('[role=radiogroup]')`,
    groups: `__find('payload & weight').closest('.grid')`,
    sec3: `__find('weather limits', 'section h3').closest('section')`,
    sec4: `__find('equipment', 'section h3').closest('section')`,
    footer: `document.querySelector('form[novalidate] .sticky')`,
  });
  await both(page, 'drone-form', ['based', 'sec1', 'modes', 'groups', 'sec3', 'sec4', 'footer'], 'form', 'form', true);
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---------- member dashboard (payload) ----------
  await go('/zz-shots/dashboard');
  await mark(page, {
    detailLabel: `__find('platform detail', 'section > div')`,
    payload: `__find('platform detail', 'section > div').nextElementSibling`,
    thresholdsM: `__find('// thresholds').parentElement`,
    perf: `__find('performance at').parentElement`,
    roseM: `__find('out-and-back radius by heading').parentElement`,
    customCard: `__find('custom', 'section *').closest('button') || __find('custom', 'section *').parentElement`,
  });
  await both(page, 'member-dash', ['payload', 'thresholdsM', 'perf', 'roseM'], 'detailLabel', 'roseM');

  // ---------- mission planner ----------
  await go('/zz-shots/mission', 5000);
  await mark(page, {
    body: `document.body`,
    missions: `__find('// missions').closest('section')`,
    droneP: `__find('// drone').closest('section')`,
    typeP: `__find('mission type').closest('section')`,
    toolbar: `__find('click on map').parentElement`,
    wind: `__find('wind at').parentElement`,
    mA: `[...document.querySelectorAll('.leaflet-marker-icon')].find(e => e.textContent.trim() === 'A')`,
    mWP: `[...document.querySelectorAll('.leaflet-marker-icon')].find(e => e.textContent.trim() === 'WP1')`,
    mB: `[...document.querySelectorAll('.leaflet-marker-icon')].find(e => e.textContent.trim() === 'B')`,
    turn: `[...document.querySelectorAll('.leaflet-marker-icon')].find(e => /[✕×]/.test(e.textContent))`,
    legend: `__find('return area').parentElement`,
  });
  await both(page, 'mission', ['missions', 'droneP', 'typeP', 'toolbar', 'wind', 'mA', 'mWP', 'mB', 'turn', 'legend'], null, null);

  // Lower sidebar: route list, result, export — give the sidebar room so it doesn't scroll.
  await page.setViewportSize({ width: 1440, height: 2300 });
  await page.waitForTimeout(1200);
  await mark(page, {
    route: `__find('// route').closest('section')`,
    result: `__find('// result').closest('section')`,
    resultStatus: `__find('feasible', 'aside *').parentElement`,
    exportP: `[...document.querySelectorAll('aside section')].pop()`,
  });
  // clip to the sidebar column only
  const aside = await page.evaluate(() => { const r = document.querySelector('aside').getBoundingClientRect(); return [r.left, r.width]; });
  for (const lang of ['en', 'uk']) {
    const boxes = await page.evaluate(() => {
      const o = {};
      for (const k of ['route', 'result', 'resultStatus', 'exportP']) {
        const r = document.querySelector(`[data-shot="${k}"]`).getBoundingClientRect();
        o[k] = [r.left, r.top + scrollY, r.width, r.height];
      }
      return o;
    });
    const y0 = boxes.route[1] - 8, y1 = boxes.exportP[1] + boxes.exportP[3] + 8;
    const clip = { x: aside[0], y: y0, width: aside[1], height: Math.round(y1 - y0) };
    await page.screenshot({ path: `${OUT}/mission-result.${lang}.png`, clip, fullPage: true });
    const rel = {};
    for (const k of ['route', 'resultStatus', 'exportP']) rel[k] = [Math.round(boxes[k][0] - clip.x), Math.round(boxes[k][1] - y0), Math.round(boxes[k][2]), Math.round(boxes[k][3])];
    result['mission-result'] = result['mission-result'] || {};
    result['mission-result'][lang] = { w: Math.round(clip.width), h: clip.height, boxes: rel };
    console.log('shot mission-result', lang);
    if (lang === 'en') await toggleLang(page);
  }

  const mm = result.mission; for (const k of Object.keys(mm.en.boxes)) if (!mm.uk.boxes[k]) mm.uk.boxes[k] = mm.en.boxes[k];
  for (const v of Object.values(result)) { delete v.w; delete v.h; delete v.boxes; }
  fs.writeFileSync(`${OUT}/shots.json`, JSON.stringify(result, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
