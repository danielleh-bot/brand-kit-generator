const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = '/tmp/chromium-install/chromium/linux-1648299/chrome-linux/chrome';
const FILE = path.resolve('/home/user/brand-kit-generator/output/weather-channel/mobile-prototype.html');
const OUT = '/tmp/qa-screenshots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  console.log('--- Loading mobile-prototype.html ---');
  await page.goto('file://' + FILE, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for images
  await new Promise(r => setTimeout(r, 3000));

  // Screenshot 1: full page
  await page.screenshot({ path: path.join(OUT, '01-full-page.png'), fullPage: true });
  console.log('Screenshot: 01-full-page.png');

  // Screenshot 2: top of phone (header + article)
  const frame = await page.$('.iphone-frame');
  if (frame) {
    await frame.screenshot({ path: path.join(OUT, '02-iphone-frame.png') });
    console.log('Screenshot: 02-iphone-frame.png');
  }

  // Check 1: em dashes in visible text
  const emDashes = await page.evaluate(() => {
    const body = document.querySelector('.iphone-screen');
    if (!body) return { found: false, text: 'no iphone-screen' };
    const text = body.innerText;
    const matches = text.match(/—/g);
    if (matches) {
      const lines = text.split('\n').filter(l => l.includes('—'));
      return { found: true, count: matches.length, lines };
    }
    return { found: false, count: 0 };
  });
  console.log('\n--- CHECK 1: Em dashes in visible text ---');
  console.log(JSON.stringify(emDashes, null, 2));

  // Check 2: image loading status
  const imageStatus = await page.evaluate(() => {
    const imgs = document.querySelectorAll('.iphone-screen img');
    return Array.from(imgs).map((img, i) => ({
      index: i,
      src: img.src.substring(0, 80),
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayed: img.style.display !== 'none' && img.style.opacity !== '0',
      complete: img.complete,
      parentHasFallback: img.parentElement.classList.contains('img-fallback'),
    }));
  });
  console.log('\n--- CHECK 2: Image loading status ---');
  const broken = imageStatus.filter(i => i.naturalWidth === 0 || !i.displayed || i.parentHasFallback);
  const loaded = imageStatus.filter(i => i.naturalWidth > 0 && i.displayed && !i.parentHasFallback);
  console.log(`Total images: ${imageStatus.length}`);
  console.log(`Loaded OK: ${loaded.length}`);
  console.log(`Broken/hidden: ${broken.length}`);
  if (broken.length > 0) {
    console.log('Broken images:');
    broken.forEach(b => console.log(`  [${b.index}] ${b.alt} | natural=${b.naturalWidth}x${b.naturalHeight} displayed=${b.displayed} fallback=${b.parentHasFallback} src=${b.src}`));
  }

  // Check 3: iPhone frame rendering
  const frameInfo = await page.evaluate(() => {
    const frame = document.querySelector('.iphone-frame');
    const screen = document.querySelector('.iphone-screen');
    if (!frame || !screen) return { ok: false, reason: 'elements not found' };
    const fRect = frame.getBoundingClientRect();
    const sRect = screen.getBoundingClientRect();
    return {
      ok: true,
      frameWidth: Math.round(fRect.width),
      frameHeight: Math.round(fRect.height),
      screenWidth: Math.round(sRect.width),
      screenHeight: Math.round(sRect.height),
      borderRadius: getComputedStyle(frame).borderRadius,
      hasNotch: !!document.querySelector('.iphone-frame::before') || getComputedStyle(frame, '::before').content !== 'none',
    };
  });
  console.log('\n--- CHECK 3: iPhone frame rendering ---');
  console.log(JSON.stringify(frameInfo, null, 2));

  // Check 4: Feed sections exist
  const feedInfo = await page.evaluate(() => {
    const headers = document.querySelectorAll('.feed-header-label');
    const hCards = document.querySelectorAll('.feed-card-h');
    const fCards = document.querySelectorAll('.feed-card-full');
    const attrib = document.querySelector('.feed-attribution');
    return {
      sectionHeaders: Array.from(headers).map(h => h.textContent.trim()),
      horizontalCards: hCards.length,
      fullWidthCards: fCards.length,
      hasTaboolaAttribution: !!attrib,
      attributionText: attrib ? attrib.textContent.trim() : null,
    };
  });
  console.log('\n--- CHECK 4: Feed structure ---');
  console.log(JSON.stringify(feedInfo, null, 2));

  // Check 5: branding colors
  const brandCheck = await page.evaluate(() => {
    const header = document.querySelector('.twc-header');
    const navActive = document.querySelector('.twc-nav a.active');
    const feedDot = document.querySelector('.feed-header-dot');
    const catBadge = document.querySelector('.article-category');
    return {
      headerBg: header ? getComputedStyle(header).backgroundColor : null,
      navActiveColor: navActive ? getComputedStyle(navActive).color : null,
      navActiveBorderColor: navActive ? getComputedStyle(navActive).borderBottomColor : null,
      feedDotBg: feedDot ? getComputedStyle(feedDot).backgroundColor : null,
      categoryColor: catBadge ? getComputedStyle(catBadge).color : null,
    };
  });
  console.log('\n--- CHECK 5: Brand colors ---');
  console.log(JSON.stringify(brandCheck, null, 2));

  // Scroll inside the iPhone to capture the feed section
  await page.evaluate(() => {
    const screen = document.querySelector('.iphone-screen');
    if (screen) screen.scrollTop = screen.scrollHeight * 0.35;
  });
  await new Promise(r => setTimeout(r, 500));
  if (frame) {
    await frame.screenshot({ path: path.join(OUT, '03-feed-section.png') });
    console.log('\nScreenshot: 03-feed-section.png');
  }

  // Scroll further down
  await page.evaluate(() => {
    const screen = document.querySelector('.iphone-screen');
    if (screen) screen.scrollTop = screen.scrollHeight * 0.55;
  });
  await new Promise(r => setTimeout(r, 500));
  if (frame) {
    await frame.screenshot({ path: path.join(OUT, '04-feed-mid.png') });
    console.log('Screenshot: 04-feed-mid.png');
  }

  // Scroll to bottom
  await page.evaluate(() => {
    const screen = document.querySelector('.iphone-screen');
    if (screen) screen.scrollTop = screen.scrollHeight;
  });
  await new Promise(r => setTimeout(r, 500));
  if (frame) {
    await frame.screenshot({ path: path.join(OUT, '05-feed-bottom.png') });
    console.log('Screenshot: 05-feed-bottom.png');
  }

  await browser.close();
  console.log('\n--- QA COMPLETE ---');
})();
