#!/usr/bin/env node
// ============================================================
//  BRAND KIT GENERATOR — CLI Entry Point
//  Usage: node generate.js --url "https://example.com/article"
// ============================================================

const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const {
  extractBrandKit, extractContent, extractNavigation, extractRelatedArticles,
  extractResponsiveBreakpoints, installBehaviorObservers, extractInteractionBehaviors,
} = require('./lib/crawler');
const { buildGoogleFontsUrl, resolveAllFonts } = require('./lib/fonts');
const { computeAnalysis } = require('./lib/analysis');
const { generateFeedContent } = require('./lib/feed-content');
const { brandKitToCss } = require('./lib/css-export');
const { normaliseHeaderForRender } = require('./lib/brand-kit-utils');
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
  .option('--accept-low-quality', 'Allow generating output from a brand kit where most tokens are fallbacks (default: refuse)')
  .option('--no-behaviors', 'Skip interaction-behavior extraction (hover/focus probes, keyframes, scroll reveal)')
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
  let relatedArticles = [];

  // Use existing brand kit or crawl
  if (opts.brandKit) {
    console.log('📄 Loading existing brand kit...');
    brandKit = JSON.parse(fs.readFileSync(path.resolve(opts.brandKit), 'utf-8'));
    // Refuse to silently produce a "successful" report from a brand kit that
    // was never actually crawled (i.e. the file is the canned defaults). The
    // user must opt into using a low-quality kit explicitly.
    const eq = brandKit && brandKit.metadata && brandKit.metadata.extraction_quality;
    if (!eq) {
      console.warn('⚠️  Loaded brand kit has no extraction_quality metadata. It may have been hand-edited or pre-generated. Re-run without --brand-kit if this is unexpected.');
    } else if (eq.total_tokens > 0 && eq.extraction_ratio < 0.5 && !opts.acceptLowQuality) {
      console.error('❌ Loaded brand kit was mostly fallbacks (extraction_ratio = ' + eq.extraction_ratio + '). Refusing to generate a polished report from synthetic data.');
      console.error('   Re-crawl the URL, or pass --accept-low-quality if you really want to proceed.');
      process.exit(1);
    }
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

      // Behavior observers MUST be installed before goto() — they capture
      // Web-Animations calls and IntersectionObserver registrations that
      // fire during page load.
      if (opts.behaviors !== false) {
        await installBehaviorObservers(page);
      }

      console.log('   Navigating to page...');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Wait a bit for lazy-loaded content
      await new Promise(r => setTimeout(r, 2000));

      console.log('   Extracting brand kit...');
      brandKit = await extractBrandKit(page, url);
      console.log('   ✓ Brand kit extracted');

      if (opts.behaviors !== false) {
        console.log('   Observing interactions (hover/focus/scroll)...');
        brandKit.behaviors = await extractInteractionBehaviors(page);
        console.log(`   ✓ ${brandKit.behaviors.transitions.length} transitions, ${brandKit.behaviors.hover_states.length} hover states, ${brandKit.behaviors.keyframes.length} keyframes`);
      }

      console.log('   Probing responsive breakpoints...');
      brandKit.layout_patterns.breakpoints = await extractResponsiveBreakpoints(page);
      console.log(`   ✓ Breakpoints (${brandKit.layout_patterns.breakpoints.source})`);

      console.log('   Extracting article content...');
      content = await extractContent(page);
      console.log('   ✓ Content extracted');

      console.log('   Extracting navigation...');
      navigation = await extractNavigation(page);
      console.log('   ✓ Navigation extracted');

      console.log('   Extracting related articles for feed...');
      relatedArticles = await extractRelatedArticles(page, url);
      console.log(`   ✓ ${relatedArticles.length} related articles extracted\n`);
    } finally {
      await browser.close();
    }
  }

  // Loud warning when extraction quality is poor — surfaces silent failures the
  // tool used to mask by filling defaults.
  const eq = brandKit && brandKit.metadata && brandKit.metadata.extraction_quality;
  if (eq && eq.total_tokens > 0 && eq.extraction_ratio < 0.5) {
    console.warn(`\n⚠️  Extraction quality is low: only ${eq.extracted_token_count}/${eq.total_tokens} brand tokens were actually pulled from the page. The rest are fallbacks. Common causes: site blocks headless Chrome, content is rendered client-side after networkidle2, or selectors did not match the publisher's markup. Inspect brand-kit.json → metadata.extraction_quality.fallback_tokens for the list.\n`);
  }
  if (!opts.brandKit && (!relatedArticles || relatedArticles.length < 3)) {
    console.warn(`⚠️  Only found ${relatedArticles ? relatedArticles.length : 0} related articles — feed will be padded with synthetic placeholders. The article URL probably doesn't expose a "related"/"popular" section. Try crawling the homepage instead to capture real card content.\n`);
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Run the same header normalisation the wizard server uses, so a
  // sticky/translucent publisher header doesn't render as invisible nav
  // when the CLI generates the prototype.
  normaliseHeaderForRender(brandKit);

  // Save brand kit JSON
  const brandKitPath = path.join(outputDir, 'brand-kit.json');
  fs.writeFileSync(brandKitPath, JSON.stringify(brandKit, null, 2));
  console.log(`📋 Brand kit saved: ${brandKitPath}`);

  // Save brand kit CSS (drop-in `:root` tokens + utility classes).
  // Keeps the CLI in lockstep with the wizard's artifact set.
  const brandKitCssPath = path.join(outputDir, 'brand-kit.css');
  fs.writeFileSync(brandKitCssPath, brandKitToCss(brandKit));
  console.log(`🎨 Brand kit CSS saved: ${brandKitCssPath}`);

  // Resolve fonts
  const resolvedFonts = resolveAllFonts(brandKit);
  const googleFontsUrl = buildGoogleFontsUrl(brandKit);

  // Generate feed content. Native cards prefer real, extracted articles; we
  // only fall back to synthetic templates when the page didn't expose enough
  // related content.
  const feedContent = generateFeedContent(brandKit, navigation, { content, relatedArticles });

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
  console.log(`   - brand-kit.css`);
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
