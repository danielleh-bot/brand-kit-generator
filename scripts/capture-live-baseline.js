#!/usr/bin/env node
/**
 * Capture live publisher chrome + current Taboola feed from an article URL.
 *
 * Usage:
 *   node scripts/capture-live-baseline.js \
 *     --url "https://www.businessinsider.com/..." \
 *     --slug business-insider \
 *     [--home "https://www.businessinsider.com/"]
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function findChrome() {
  const fromArg = arg('chrome');
  if (fromArg) return fromArg;
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find((c) => fs.existsSync(c));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dismissConsent(page) {
  const selectors = [
    '#onetrust-accept-btn-handler',
    'button[aria-label="Accept"]',
    'button[aria-label="Accept all"]',
    '[data-testid="accept-cookies"]',
  ];
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        await sleep(500);
        return;
      }
    } catch (_) { /* ignore */ }
  }
  try {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      const hit = buttons.find((b) => /accept|agree|got it|i agree/i.test(b.textContent || ''));
      if (hit) hit.click();
    });
  } catch (_) { /* ignore */ }
}

async function extractTaboolaMeta(page) {
  return page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const loaderMatch = html.match(/cdn\.taboola\.com\/libtrc\/([^/"']+)\/loader\.js/);
    const containers = Array.from(
      document.querySelectorAll('[id*="taboola"], [class*="taboola"], .trc_rbox_container, .tbl-feed-container')
    ).map((el) => ({
      id: el.id || null,
      className: el.className || null,
      childCount: el.children.length,
    }));

    // BI embeds provider config as HTML-escaped JSON in a script/data blob
    const decoded = html
      .replace(/&quot;/g, '"')
      .replace(/&#x3D;/g, '=')
      .replace(/&amp;/g, '&');
    const modeMatch = decoded.match(/"mode"\s*:\s*"([^"]+)"/);
    const placeMatch = decoded.match(/"placement"\s*:\s*"([^"]+)"/);
    const contMatch = decoded.match(/"container"\s*:\s*"([^"]+)"/);
    const targetMatch = decoded.match(/"target_type"\s*:\s*"([^"]+)"/);

    return {
      publisherSlug: loaderMatch ? loaderMatch[1] : null,
      loaderUrl: loaderMatch ? `https://cdn.taboola.com/libtrc/${loaderMatch[1]}/loader.js` : null,
      mode: modeMatch ? modeMatch[1] : null,
      placement: placeMatch ? placeMatch[1] : null,
      container: contMatch ? contMatch[1] : null,
      targetType: targetMatch ? targetMatch[1] : null,
      containers,
      hasWindowTaboola: typeof window._taboola !== 'undefined',
    };
  });
}

async function waitForFeed(page, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await page.evaluate(() => {
      const root =
        document.querySelector('#taboola-below-main-column') ||
        document.querySelector('[id*="taboola-below"]') ||
        document.querySelector('.trc_rbox_container') ||
        document.querySelector('[data-mode]');
      if (!root) return { ok: false, reason: 'no-container' };
      const cards = root.querySelectorAll(
        '.tbl-feed-card, .videoCube, [data-item-type], .trcItem, a.item-label-href, .thumbBlock'
      );
      const titles = root.querySelectorAll('.video-title, .thumbBlock + *, [class*="title"]');
      return {
        ok: cards.length >= 2 || titles.length >= 2,
        cardCount: cards.length,
        titleCount: titles.length,
        rootId: root.id || null,
        rootClass: root.className || null,
      };
    });
    if (ready.ok) return ready;
    await sleep(1000);
  }
  return { ok: false, reason: 'timeout' };
}

async function extractFeedDom(page) {
  return page.evaluate(() => {
    const root =
      document.querySelector('#taboola-below-main-column') ||
      document.querySelector('[id*="taboola-below"]') ||
      document.querySelector('.trc_rbox_container') ||
      document.querySelector('.tbl-feed-container');
    if (!root) return { cards: [], header: null };

    const headerEl = root.querySelector(
      '.tbl-feed-header-text, .trc_rbox_header, [class*="header"] h3, [class*="header"] h4'
    );
    const cards = [];
    const cardEls = root.querySelectorAll('.tbl-feed-card, .videoCube, li[data-item-type], .trcItem');
    const list = cardEls.length ? cardEls : root.querySelectorAll('a[href]');

    list.forEach((el, idx) => {
      if (idx > 24) return;
      const titleEl =
        el.querySelector('.video-title, .thumb-title, [class*="title"]') ||
        (el.matches('a') ? el : null);
      const brandingEl = el.querySelector('.branding, .video-label, [class*="branding"], .sponsor-label');
      const imgEl = el.querySelector('img');
      const sponsored =
        !!el.querySelector('.trc_sponsored_overlay, [class*="sponsored"], .trc-content-sponsored') ||
        /sponsor|advert|anzeige/i.test(el.textContent || '');
      const title = (titleEl && (titleEl.textContent || '').trim()) || '';
      if (!title || title.length < 8) return;
      cards.push({
        index: cards.length,
        title: title.slice(0, 200),
        branding: brandingEl ? (brandingEl.textContent || '').trim().slice(0, 80) : null,
        href: el.href || (el.querySelector('a') && el.querySelector('a').href) || null,
        thumbnail: imgEl ? imgEl.src || imgEl.getAttribute('data-src') : null,
        sponsored,
        classes: (el.className || '').toString().slice(0, 160),
      });
    });

    return {
      header: headerEl ? (headerEl.textContent || '').trim() : null,
      rootId: root.id || null,
      rootClass: (root.className || '').toString().slice(0, 200),
      cards,
      htmlSnippet: root.outerHTML.slice(0, 5000),
    };
  });
}

async function extractCssVars(page) {
  return page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const keys = [
      '--base-text-color',
      '--base-a-color',
      '--base-a-hover-color',
      '--app-background',
      '--bs-body-font-family',
      '--primary-red',
      '--border-color-2',
    ];
    const out = {};
    for (const k of keys) {
      const v = styles.getPropertyValue(k);
      if (v) out[k] = v.trim();
    }
    // Also scrape :root from stylesheets when readable
    const scraped = {};
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (rule.selectorText === ':root' && rule.style) {
            for (let i = 0; i < rule.style.length; i++) {
              const name = rule.style[i];
              if (name.startsWith('--') && /font|color|background|border|primary|base|app/.test(name)) {
                scraped[name] = rule.style.getPropertyValue(name).trim();
              }
            }
          }
        }
      }
    } catch (_) { /* ignore */ }
    return { computed: out, scraped };
  });
}

async function main() {
  const url = arg('url');
  const home = arg('home', 'https://www.businessinsider.com/');
  const slug = arg('slug', 'business-insider');
  if (!url) {
    console.error('Missing --url');
    process.exit(1);
  }
  const chrome = findChrome();
  if (!chrome) {
    console.error('Chrome not found');
    process.exit(1);
  }

  const outDir = path.resolve('output', slug, 'captures');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: false, // headed often required for Taboola; fall back below if unavailable
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,2200',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
  }).catch(async () =>
    puppeteer.launch({
      executablePath: chrome,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,2200', '--disable-blink-features=AutomationControlled'],
      defaultViewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
    })
  );

  const meta = {
    capturedAt: new Date().toISOString(),
    articleUrl: url,
    homeUrl: home,
    chrome,
  };

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const networkHits = [];
    page.on('response', async (res) => {
      try {
        const u = res.url();
        if (/taboola|trc\.taboola|api\.taboola|cdn\.taboola/i.test(u)) {
          const entry = { url: u.slice(0, 300), status: res.status() };
          if (/recommendations|json|feed|homepage/i.test(u) && res.status() === 200) {
            const ct = res.headers()['content-type'] || '';
            if (ct.includes('json')) {
              entry.json = await res.json().catch(() => null);
            }
          }
          networkHits.push(entry);
        }
      } catch (_) { /* ignore */ }
    });

    // Homepage chrome
    console.log('→ homepage', home);
    await page.goto(home, { waitUntil: 'networkidle2', timeout: 90000 });
    await dismissConsent(page);
    await sleep(1500);
    await page.screenshot({ path: path.join(outDir, 'homepage-chrome.png'), fullPage: false });

    // Article
    console.log('→ article', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    await dismissConsent(page);
    await sleep(2000);

    const taboolaMeta = await extractTaboolaMeta(page);
    meta.taboola = taboolaMeta;
    console.log('Taboola meta', taboolaMeta);

    await page.screenshot({ path: path.join(outDir, 'article-chrome.png'), fullPage: false });

    // BI often delays Taboola until after hydration — bootstrap loader + placement
    await page.evaluate(() => {
      window._taboola = window._taboola || [];
      window._taboola.push({ article: 'auto', url: location.href });
      window._taboola.push({
        mode: 'thumbs-1r',
        container: 'taboola-below-main-column',
        placement: 'below-main-column',
        target_type: 'mix',
      });
      if (![...document.scripts].some((s) => (s.src || '').includes('/libtrc/') && s.src.includes('loader.js'))) {
        const s = document.createElement('script');
        s.src = 'https://cdn.taboola.com/libtrc/businessinsider/loader.js';
        s.async = true;
        document.body.appendChild(s);
      }
    });

    // Scroll to feed to trigger lazy load
    await page.evaluate(async () => {
      const el =
        document.querySelector('#taboola-below-main-column') ||
        document.querySelector('[id*="taboola"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      else window.scrollTo(0, document.body.scrollHeight * 0.7);
    });
    await sleep(2000);
    // Nudge scroll
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 400));
      await sleep(800);
    }

    const feedReady = await waitForFeed(page);
    meta.feedReady = feedReady;
    console.log('Feed ready', feedReady);

    const feedDom = await extractFeedDom(page);
    meta.feedCardCount = feedDom.cards.length;
    fs.writeFileSync(path.join(outDir, 'feed-dom.json'), JSON.stringify(feedDom, null, 2));

    meta.networkHits = networkHits.slice(0, 40);
    // If DOM cards empty, try to recover titles from Taboola JSON responses
    if (!feedDom.cards.length) {
      for (const hit of networkHits) {
        const list = hit.json && (hit.json.placements || hit.json.list || hit.json.assets);
        if (!Array.isArray(list)) continue;
        for (const item of list.slice(0, 20)) {
          const title = item.name || item.title || item.description;
          if (!title) continue;
          feedDom.cards.push({
            index: feedDom.cards.length,
            title: String(title).slice(0, 200),
            branding: item.branding || item.origin || null,
            href: item.url || item.click_url || null,
            thumbnail: item.thumbnail?.[0]?.url || item.thumbnail || item.image || null,
            sponsored: Boolean(item['s-type'] === 's' || item.type === 'sponsored' || item.isSponsored),
            classes: 'from-network',
          });
        }
      }
      if (feedDom.cards.length) {
        feedDom.source = 'taboola-network-json';
        fs.writeFileSync(path.join(outDir, 'feed-dom.json'), JSON.stringify(feedDom, null, 2));
      }
    }

    // Crop feed region if visible; otherwise page screenshot near bottom
    let feedShot = false;
    for (const sel of ['#taboola-below-main-column', '[id*="taboola-below"]', '.trc_rbox_container', '.post-bottom-taboola']) {
      const handle = await page.$(sel);
      if (!handle) continue;
      const box = await handle.boundingBox();
      if (box && box.height > 40) {
        await handle.screenshot({ path: path.join(outDir, 'current-feed.png') });
        feedShot = true;
        break;
      }
    }
    if (!feedShot) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.85));
      await sleep(500);
      await page.screenshot({ path: path.join(outDir, 'current-feed.png'), fullPage: false });
    }

    // Full page for context
    await page.screenshot({ path: path.join(outDir, 'article-full.png'), fullPage: true });

    const cssVars = await extractCssVars(page);
    fs.writeFileSync(path.join(outDir, 'css-vars.json'), JSON.stringify(cssVars, null, 2));

    // Sample computed styles for key roles (designer mapping)
    const roleStyles = await page.evaluate(() => {
      function sample(sel) {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          selector: sel,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          color: cs.color,
          lineHeight: cs.lineHeight,
          text: (el.textContent || '').trim().slice(0, 80),
        };
      }
      return {
        h1: sample('h1'),
        subscribe: sample('a[href*="subscribe"], a[href*="Subscribe"]'),
        navLink: sample('nav a, header a'),
        body: sample('article p, [class*="content"] p'),
      };
    });
    fs.writeFileSync(path.join(outDir, 'role-styles.json'), JSON.stringify(roleStyles, null, 2));

    fs.writeFileSync(path.join(outDir, 'capture-meta.json'), JSON.stringify(meta, null, 2));
    console.log('✓ wrote captures to', outDir);
    if (!feedDom.cards.length) {
      console.warn('⚠️  No feed cards extracted — feed may be blocked in headless.');
      process.exitCode = 2;
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
