// ============================================================
//  WIZARD SERVER
//  Express backend that drives the brand-kit wizard SPA.
//  Streams real Puppeteer extraction progress over SSE, then
//  writes the same artifacts the CLI produces (brand-kit.json,
//  brand-kit.css, prototype.html, analysis-report.html) into
//  ./output/<slug>/ so they can be downloaded or uploaded to Nexus.
// ============================================================

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const puppeteer = require('puppeteer-core');

const {
  extractBrandKit,
  extractContent,
  extractNavigation,
  extractRelatedArticles,
} = require('./lib/crawler');
const { buildGoogleFontsUrl, resolveAllFonts } = require('./lib/fonts');
const { computeAnalysis } = require('./lib/analysis');
const { generateFeedContent } = require('./lib/feed-content');
const { brandKitToCss } = require('./lib/css-export');
const defaults = require('./lib/defaults');
const engine = require('./lib/engine');

const ROOT = __dirname;
const OUTPUT_DIR = path.join(ROOT, 'output');
const PORT = parseInt(process.env.PORT || '4000', 10);

const CHROME_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  for (const c of CHROME_CANDIDATES) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function deriveSlug(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').replace(/\./g, '-');
  } catch {
    return 'unknown-publisher';
  }
}

function ensureOutputDir(slug) {
  const dir = path.join(OUTPUT_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---- SSE helpers ---------------------------------------------------------

function openStream(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 10000\n\n');
}

function sendEvent(res, type, data) {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Stages displayed in the wizard. The labels match the animated checklist
// rendered by the SPA — keep them in sync with wizard.js.
const CRAWL_STAGES = [
  { id: 'launch',     label: 'Launching browser' },
  { id: 'navigate',   label: 'Loading the page' },
  { id: 'brand',      label: 'Reading colours, fonts & logo' },
  { id: 'content',    label: 'Extracting article content' },
  { id: 'navigation', label: 'Mapping site navigation' },
  { id: 'related',    label: 'Collecting related articles' },
  { id: 'render',     label: 'Rendering report & prototype' },
];

// Stages for the "try on another article" flow — brand kit is reused, so we
// skip the brand-extraction step.
const PROTO_STAGES = [
  { id: 'launch',   label: 'Launching browser' },
  { id: 'navigate', label: 'Loading the article' },
  { id: 'content',  label: 'Extracting article content' },
  { id: 'related',  label: 'Collecting related articles' },
  { id: 'render',   label: 'Re-rendering prototype' },
];

// ---- Core crawl flow -----------------------------------------------------

async function runArticleCrawl({ url, stage, log }) {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error(
      'Chrome/Chromium not found. Install it or set CHROME_PATH=/path/to/chrome.',
    );
  }
  stage('launch', 'active');
  log(`Using browser at ${chromePath}`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  stage('launch', 'done');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    );

    stage('navigate', 'active');
    log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));
    stage('navigate', 'done');

    stage('content', 'active');
    const content = await extractContent(page);
    stage('content', 'done');

    // Re-grab navigation in case the article lives under a different section
    const navigation = await extractNavigation(page);

    stage('related', 'active');
    const relatedArticles = await extractRelatedArticles(page, url);
    log(`Found ${relatedArticles.length} related articles`);
    stage('related', 'done');

    return { content, navigation, relatedArticles };
  } finally {
    await browser.close();
  }
}

async function runCrawl({ url, slug, stage, log }) {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error(
      'Chrome/Chromium not found. Install it or set CHROME_PATH=/path/to/chrome.',
    );
  }

  stage('launch', 'active');
  log(`Using browser at ${chromePath}`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
  });
  stage('launch', 'done');

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    );

    stage('navigate', 'active');
    log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
    stage('navigate', 'done');

    stage('brand', 'active');
    const brandKit = await extractBrandKit(page, url);
    stage('brand', 'done');

    stage('content', 'active');
    const content = await extractContent(page);
    stage('content', 'done');

    stage('navigation', 'active');
    const navigation = await extractNavigation(page);
    stage('navigation', 'done');

    stage('related', 'active');
    const relatedArticles = await extractRelatedArticles(page, url);
    log(`Found ${relatedArticles.length} related articles`);
    stage('related', 'done');

    return { brandKit, content, navigation, relatedArticles };
  } finally {
    await browser.close();
  }
}

function writeArtifacts({ slug, brandKit, content, navigation, relatedArticles }) {
  const outDir = ensureOutputDir(slug);

  fs.writeFileSync(
    path.join(outDir, 'brand-kit.json'),
    JSON.stringify(brandKit, null, 2),
  );
  fs.writeFileSync(
    path.join(outDir, 'brand-kit.css'),
    brandKitToCss(brandKit),
  );

  const resolvedFonts = resolveAllFonts(brandKit);
  const googleFontsUrl = buildGoogleFontsUrl(brandKit);
  const feedContent = generateFeedContent(brandKit, navigation, {
    content,
    relatedArticles,
  });
  const analysis = computeAnalysis(brandKit, defaults);

  engine.init();
  const templateData = {
    brandKit,
    content,
    navigation,
    feedContent,
    analysis,
    resolvedFonts,
    googleFontsUrl,
    slug,
  };

  fs.writeFileSync(
    path.join(outDir, 'index.html'),
    engine.render('prototype.hbs', templateData),
  );
  fs.writeFileSync(
    path.join(outDir, 'analysis-report.html'),
    engine.render('report.hbs', templateData),
  );

  return {
    slug,
    files: ['brand-kit.json', 'brand-kit.css', 'index.html', 'analysis-report.html'],
    metadata: {
      extraction_quality:
        brandKit && brandKit.metadata && brandKit.metadata.extraction_quality,
      related_article_count: relatedArticles ? relatedArticles.length : 0,
    },
  };
}

// ---- Routes --------------------------------------------------------------

const app = express();
app.use(express.json({ limit: '2mb' }));

// Static: the wizard SPA itself
app.use(express.static(path.join(ROOT, 'wizard')));
// Static: generated artifacts, served read-only so the wizard can iframe them
app.use('/output', express.static(OUTPUT_DIR));

// List previously generated publishers (for the wizard's "recent" picker)
app.get('/api/publishers', (req, res) => {
  if (!fs.existsSync(OUTPUT_DIR)) return res.json({ publishers: [] });
  const entries = fs
    .readdirSync(OUTPUT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const slug = e.name;
      const jsonPath = path.join(OUTPUT_DIR, slug, 'brand-kit.json');
      let brand = null;
      let modified = 0;
      try {
        const stat = fs.statSync(jsonPath);
        modified = stat.mtimeMs;
        const kit = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        brand = (kit.brand && kit.brand.name) || slug;
      } catch {
        brand = slug;
      }
      return { slug, name: brand, modified };
    })
    .sort((a, b) => b.modified - a.modified);
  res.json({ publishers: entries });
});

// SSE: crawl a publisher URL and stream progress
app.get('/api/crawl', async (req, res) => {
  const url = (req.query.url || '').trim();
  if (!url) {
    res.status(400).json({ error: 'Missing url' });
    return;
  }
  const slug = (req.query.slug || deriveSlug(url)).trim();

  openStream(res);
  const stages = CRAWL_STAGES.map((s) => ({ ...s, status: 'pending' }));
  sendEvent(res, 'stages', { stages });

  const stage = (id, status) => {
    const s = stages.find((x) => x.id === id);
    if (s) s.status = status;
    sendEvent(res, 'stage', { id, status });
  };
  const log = (message) => sendEvent(res, 'log', { message });

  try {
    const crawled = await runCrawl({ url, slug, stage, log });
    stage('render', 'active');
    const result = writeArtifacts({ slug, ...crawled });
    stage('render', 'done');
    sendEvent(res, 'done', {
      slug,
      brandKit: crawled.brandKit,
      result,
      links: {
        brandKitJson: `/output/${slug}/brand-kit.json`,
        brandKitCss: `/output/${slug}/brand-kit.css`,
        prototype: `/output/${slug}/index.html`,
        report: `/output/${slug}/analysis-report.html`,
      },
    });
  } catch (err) {
    sendEvent(res, 'error', { message: err.message || String(err) });
  } finally {
    res.end();
  }
});

// SSE: re-render the prototype + report for an existing brand kit, using a
// different article URL as the content source. Brand-kit tokens are reused
// (we don't re-extract colours/fonts) so this is much faster than /api/crawl.
app.get('/api/prototype', async (req, res) => {
  const slug = (req.query.slug || '').trim();
  const url = (req.query.url || '').trim();
  if (!slug || !url) {
    res.status(400).json({ error: 'Missing slug or url' });
    return;
  }
  const kitPath = path.join(OUTPUT_DIR, slug, 'brand-kit.json');
  if (!fs.existsSync(kitPath)) {
    res.status(404).json({ error: `No brand kit at ${slug}. Crawl first.` });
    return;
  }
  const brandKit = JSON.parse(fs.readFileSync(kitPath, 'utf-8'));

  openStream(res);
  const stages = PROTO_STAGES.map((s) => ({ ...s, status: 'pending' }));
  sendEvent(res, 'stages', { stages });

  const stage = (id, status) => {
    const s = stages.find((x) => x.id === id);
    if (s) s.status = status;
    sendEvent(res, 'stage', { id, status });
  };
  const log = (message) => sendEvent(res, 'log', { message });

  try {
    const { content, navigation, relatedArticles } = await runArticleCrawl({ url, stage, log });
    stage('render', 'active');
    const result = writeArtifacts({ slug, brandKit, content, navigation, relatedArticles });
    stage('render', 'done');
    sendEvent(res, 'done', {
      slug,
      result,
      links: {
        brandKitJson: `/output/${slug}/brand-kit.json`,
        brandKitCss: `/output/${slug}/brand-kit.css`,
        prototype: `/output/${slug}/index.html`,
        report: `/output/${slug}/analysis-report.html`,
      },
    });
  } catch (err) {
    sendEvent(res, 'error', { message: err.message || String(err) });
  } finally {
    res.end();
  }
});

// Read a previously crawled brand kit (used when restoring a session)
app.get('/api/brand-kit/:slug', (req, res) => {
  const file = path.join(OUTPUT_DIR, req.params.slug, 'brand-kit.json');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  try {
    const kit = JSON.parse(fs.readFileSync(file, 'utf-8'));
    res.json({
      slug: req.params.slug,
      brandKit: kit,
      links: {
        brandKitJson: `/output/${req.params.slug}/brand-kit.json`,
        brandKitCss: `/output/${req.params.slug}/brand-kit.css`,
        prototype: `/output/${req.params.slug}/index.html`,
        report: `/output/${req.params.slug}/analysis-report.html`,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, chrome: !!findChrome() });
});

// Fall back to the SPA shell for any non-API route (so deep-links work).
app.get(/^\/(?!api\/|output\/).*/, (req, res) => {
  res.sendFile(path.join(ROOT, 'wizard', 'index.html'));
});

const server = http.createServer(app);
server.listen(PORT, () => {
  const chrome = findChrome();
  console.log(`\n🪄  Brand Kit Wizard running on http://localhost:${PORT}`);
  console.log(`    Output directory: ${OUTPUT_DIR}`);
  console.log(`    Chrome:           ${chrome || '⚠ not found — set CHROME_PATH'}\n`);
});
