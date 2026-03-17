#!/usr/bin/env node
// ============================================================
//  BRAND KIT GENERATOR — CLI Entry Point
//  Usage: node generate.js --url "https://example.com/article"
// ============================================================

const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const { extractBrandKit, extractContent, extractNavigation } = require('./lib/crawler');
const { buildGoogleFontsUrl, resolveAllFonts } = require('./lib/fonts');
const { computeAnalysis } = require('./lib/analysis');
const { generateFeedContent } = require('./lib/feed-content');
const defaults = require('./lib/defaults');
const engine = require('./lib/engine');

program
  .name('brand-kit')
  .description('Taboola Brand Kit Generator — extract publisher design tokens and generate branded feed prototypes')
  .version('2.0.0')
  .requiredOption('--url <url>', 'Publisher article URL to crawl')
  .option('--slug <slug>', 'Publisher slug for output directory (default: derived from domain)')
  .option('--output <dir>', 'Output directory', './output')
  .option('--report-only', 'Only generate analysis report (skip prototype)')
  .option('--prototype-only', 'Only generate feed prototype (skip report)')
  .option('--brand-kit <path>', 'Use existing brand-kit.json instead of crawling')
  .option('--chrome <path>', 'Path to Chrome/Chromium executable')
  .option('--list', 'List previously generated publishers')
  .parse();

const opts = program.opts();

// --list: show existing outputs
if (opts.list) {
  const outDir = path.resolve(opts.output);
  if (!fs.existsSync(outDir)) {
    console.log('No output directory found.');
    process.exit(0);
  }
  const entries = fs.readdirSync(outDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
  if (entries.length === 0) {
    console.log('No publishers generated yet.');
  } else {
    console.log('Generated publishers:');
    entries.forEach(e => console.log(`  - ${e}`));
  }
  process.exit(0);
}

/**
 * Detect Chrome executable path
 */
function findChrome() {
  if (opts.chrome) return opts.chrome;

  const candidates = [
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Windows (WSL)
    '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
    '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  return null;
}

/**
 * Derive a slug from a URL
 */
function deriveSlug(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '').replace(/\./g, '-');
  } catch {
    return 'unknown-publisher';
  }
}

async function main() {
  const url = opts.url;
  const slug = opts.slug || deriveSlug(url);
  const outputDir = path.resolve(opts.output, slug);

  console.log(`\n🔍 Brand Kit Generator v2.0`);
  console.log(`   URL:    ${url}`);
  console.log(`   Slug:   ${slug}`);
  console.log(`   Output: ${outputDir}\n`);

  let brandKit;
  let content = {};
  let navigation = {};

  // Use existing brand kit or crawl
  if (opts.brandKit) {
    console.log('📄 Loading existing brand kit...');
    brandKit = JSON.parse(fs.readFileSync(path.resolve(opts.brandKit), 'utf-8'));
    console.log('   ✓ Brand kit loaded\n');
  } else {
    // Find Chrome
    const chromePath = findChrome();
    if (!chromePath) {
      console.error('❌ Chrome/Chromium not found. Install Chrome or pass --chrome <path>');
      console.error('   On Ubuntu: sudo apt install chromium-browser');
      console.error('   On macOS: brew install --cask chromium');
      process.exit(1);
    }
    console.log(`🌐 Launching browser (${path.basename(chromePath)})...`);

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

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      console.log('   Navigating to page...');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Wait a bit for lazy-loaded content
      await new Promise(r => setTimeout(r, 2000));

      console.log('   Extracting brand kit...');
      brandKit = await extractBrandKit(page, url);
      console.log('   ✓ Brand kit extracted');

      console.log('   Extracting article content...');
      content = await extractContent(page);
      console.log('   ✓ Content extracted');

      console.log('   Extracting navigation...');
      navigation = await extractNavigation(page);
      console.log('   ✓ Navigation extracted\n');
    } finally {
      await browser.close();
    }
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Save brand kit JSON
  const brandKitPath = path.join(outputDir, 'brand-kit.json');
  fs.writeFileSync(brandKitPath, JSON.stringify(brandKit, null, 2));
  console.log(`📋 Brand kit saved: ${brandKitPath}`);

  // Resolve fonts
  const resolvedFonts = resolveAllFonts(brandKit);
  const googleFontsUrl = buildGoogleFontsUrl(brandKit);

  // Generate feed content
  const feedContent = generateFeedContent(brandKit, navigation);

  // Compute analysis
  const analysis = computeAnalysis(brandKit, defaults);

  // Initialize template engine
  engine.init();

  // Template data context
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

  // Generate prototype
  if (!opts.reportOnly) {
    console.log('🎨 Generating feed prototype...');
    const protoHtml = engine.render('prototype.hbs', templateData);
    const protoPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(protoPath, protoHtml);
    console.log(`   ✓ Prototype saved: ${protoPath}`);
  }

  // Generate analysis report
  if (!opts.prototypeOnly) {
    console.log('📊 Generating analysis report...');
    const reportHtml = engine.render('report.hbs', templateData);
    const reportPath = path.join(outputDir, 'analysis-report.html');
    fs.writeFileSync(reportPath, reportHtml);
    console.log(`   ✓ Report saved: ${reportPath}`);
  }

  console.log(`\n✅ Done! Output files in: ${outputDir}`);
  console.log(`   - brand-kit.json`);
  if (!opts.reportOnly) console.log(`   - index.html (feed prototype)`);
  if (!opts.prototypeOnly) console.log(`   - analysis-report.html (analysis report)`);
  console.log('');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  if (err.message.includes('ERR_CONNECTION_REFUSED') || err.message.includes('net::')) {
    console.error('   The URL may be unreachable or blocking automated access.');
  }
  process.exit(1);
});
