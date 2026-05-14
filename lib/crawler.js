// ============================================================
//  PUPPETEER-BASED PAGE CRAWLER
//  Extracts rich brand kit JSON, article content, and navigation
//  from a live publisher page using headless Chrome
// ============================================================

/**
 * Extract a comprehensive brand kit from the page
 * @param {import('puppeteer-core').Page} page
 * @param {string} url - The crawled URL
 * @returns {Promise<object>} - Rich nested brand kit JSON
 */
async function extractBrandKit(page, url) {
  const domain = new URL(url).hostname.replace(/^www\./, '');

  const extracted = await page.evaluate(() => {
    // ---- HELPERS ----
    function rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    function parseColor(str) {
      if (!str) return null;
      str = str.trim();
      if (str === 'transparent' || str === 'rgba(0, 0, 0, 0)') return null;
      const rgb = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (rgb) {
        const r = parseInt(rgb[1]), g = parseInt(rgb[2]), b = parseInt(rgb[3]);
        return { hex: rgbToHex(r, g, b), rgb: str, r, g, b };
      }
      if (str.startsWith('#')) {
        let hex = str.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        if (hex.length === 8) hex = hex.substring(0, 6);
        const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
        return { hex: '#' + hex.toUpperCase(), rgb: `rgb(${r}, ${g}, ${b})`, r, g, b };
      }
      return null;
    }

    function isGray(c) {
      if (!c) return true;
      return Math.abs(c.r - c.g) < 20 && Math.abs(c.g - c.b) < 20 && Math.abs(c.r - c.b) < 20;
    }

    function luminance(c) {
      if (!c) return 128;
      return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    }

    function getCS(el, prop) {
      return window.getComputedStyle(el).getPropertyValue(prop);
    }

    function getMeta(prop) {
      const el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
      return el ? (el.content || el.getAttribute('content') || '').trim() : '';
    }

    function unique(arr) { return [...new Set(arr)]; }

    function cleanFont(f) { return f.trim().replace(/['"]/g, ''); }

    // ---- BRAND ----
    const siteName = getMeta('og:site_name') || getMeta('application-name') || document.title.split(/[|\-–—]/)[0].trim();
    const description = getMeta('og:description') || getMeta('description') || '';
    const lang = document.documentElement.lang || 'en';
    const themeColor = getMeta('theme-color');

    const brand = {
      name: siteName,
      tagline: '',
      website: window.location.origin,
      description: description.substring(0, 200),
      language: lang
    };

    // ---- LOGOS ----
    const logos = { primary: {}, variants: [], brand_mark: null };
    // Find header logo. Scoring rather than first-match — early publishers
    // shove sponsor partner logos, tiny social icons, and decorative SVGs
    // into the header too, so the naive query selector returned the wrong
    // image on most sites.
    const headerEl = document.querySelector('header, [role="banner"], .header, #header');
    if (headerEl) {
      const candidates = Array.from(headerEl.querySelectorAll('img, svg'));
      let best = null;
      let bestScore = -Infinity;
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        const h = rect.height;
        const w = rect.width;
        if (h < 16 || w < 24) continue; // skip tiny icons
        // Don't pick anything inside a nav list — those are nav icons,
        // not the publisher logo.
        if (el.closest('nav ul, [role="navigation"] ul, nav li, [role="menuitem"]')) continue;
        // Skip anything that looks like an ad or sponsor mark.
        const alt = (el.getAttribute('alt') || '') + ' ' + (el.className?.baseVal || el.className || '');
        if (/\b(sponsor|partner|ad-|advert|cookie|consent|social|tiktok|youtube|facebook|twitter|instagram|linkedin)\b/i.test(alt)) continue;

        let score = 0;
        // Prefer larger images
        score += Math.min(h, 80);
        // Prefer those in the left half of the header (logos sit at start
        // in LTR, end in RTL — either way they're at a horizontal edge)
        const headerRect = headerEl.getBoundingClientRect();
        const relX = rect.left - headerRect.left;
        if (relX < headerRect.width * 0.25 || relX > headerRect.width * 0.75) score += 20;
        // Prefer alt/class containing "logo" or matching the brand name
        if (/\blogo\b/i.test(alt)) score += 30;
        if (el.tagName === 'SVG' && el.outerHTML.length < 4000) score += 5; // inline SVG is usually a brand mark
        if (el.tagName === 'IMG' && /\blogo\b/i.test(el.getAttribute('src') || '')) score += 20;
        if (score > bestScore) { bestScore = score; best = el; }
      }
      if (best) {
        if (best.tagName === 'SVG') {
          // Preserve the entire SVG — truncating mid-tag would render as
          // broken HTML and produce a "wrong logo" in the prototype. Strip
          // any <script>, event handlers, and javascript: URLs first so a
          // hostile publisher page can't slip code into the prototype or
          // wizard when their SVG gets injected via innerHTML / triple-stash.
          // (Same-origin: the prototype lives under /output/<slug>/ and the
          // wizard renders the logo on its own page.) If the SVG is
          // unreasonably huge (rare; usually <8KB even for complex logos),
          // skip the inline copy and fall back to the URL/text.
          let svgHtml = best.outerHTML;
          if (svgHtml.length <= 16000 && /<\/svg>\s*$/i.test(svgHtml)) {
            svgHtml = svgHtml
              .replace(/<script\b[\s\S]*?<\/script>/gi, '')
              .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
              .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
              .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
              .replace(/(href|xlink:href)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '');
            logos.primary.type = 'svg';
            logos.primary.svg = svgHtml;
          }
          logos.primary.width = best.getBoundingClientRect().width;
          logos.primary.height = best.getBoundingClientRect().height;
        } else {
          logos.primary.type = 'image';
          logos.primary.url = best.src || '';
          logos.primary.alt = best.alt || '';
          logos.primary.width = best.getBoundingClientRect().width;
          logos.primary.height = best.getBoundingClientRect().height;
        }
      }
      // Logo text fallback / supplemental
      const logoLink = headerEl.querySelector('a[class*="logo"], .logo, [class*="brand"]');
      if (logoLink) {
        const text = logoLink.textContent.trim();
        if (text.length < 50) logos.primary.text = text;
        const cs = window.getComputedStyle(logoLink);
        logos.primary.font = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim() + ' ' + cs.fontWeight;
      }
    }
    // Favicon
    const faviconLink = document.querySelector('link[rel*="icon"]');
    if (faviconLink) {
      try {
        logos.favicon_url = new URL(faviconLink.href, window.location.origin).href;
      } catch(e) {
        logos.favicon_url = faviconLink.href;
      }
    }

    // ---- COLORS ----
    const colorUsages = {};
    function trackColor(c, usage) {
      if (!c || !c.hex) return;
      if (!colorUsages[c.hex]) colorUsages[c.hex] = { color: c, usages: [], count: 0 };
      colorUsages[c.hex].count++;
      if (usage && !colorUsages[c.hex].usages.includes(usage)) {
        colorUsages[c.hex].usages.push(usage);
      }
    }

    // Scan key elements for colors. Selectors are intentionally broad: modern publishers
    // ship hashed CSS-module class names, so we lean on tag + role + ARIA + common
    // class-name fragments to find brand surfaces.
    const colorSources = [
      { sel: 'a, [role="link"]', prop: 'color', usage: 'Links' },
      { sel: 'button, [role="button"], .btn, [class*="button"], [class*="Button"], [class*="cta"], [class*="CTA"], [type="submit"], a[class*="btn"]', prop: 'background-color', usage: 'Buttons' },
      { sel: 'button, [role="button"], .btn, [class*="button"], [class*="Button"], [class*="cta"], [class*="CTA"], [type="submit"], a[class*="btn"]', prop: 'color', usage: 'Button text' },
      { sel: 'nav a, [role="navigation"] a, header a, [class*="nav"] a, [class*="Nav"] a, [class*="menu"] a', prop: 'color', usage: 'Navigation' },
      { sel: 'h1, h2, h3, [class*="headline"], [class*="Headline"], [class*="title"], [class*="Title"]', prop: 'color', usage: 'Headlines' },
      { sel: 'p, [class*="body"], [class*="Body"], article > div, [class*="paragraph"]', prop: 'color', usage: 'Body text' },
      { sel: 'time, .date, .timestamp, [class*="meta"], [class*="Meta"], [class*="byline"], [datetime]', prop: 'color', usage: 'Timestamps' },
      { sel: 'header, [role="banner"], [class*="masthead"], [class*="header"]', prop: 'background-color', usage: 'Header background' },
      { sel: 'footer, [role="contentinfo"], [class*="footer"], [class*="Footer"]', prop: 'background-color', usage: 'Footer background' },
      { sel: 'body', prop: 'background-color', usage: 'Page background' },
      { sel: 'main, [role="main"], [class*="main"], [class*="content"], section, [class*="section"], [class*="container"]', prop: 'background-color', usage: 'Section background' },
      { sel: 'hr, [class*="separator"], [class*="divider"], [role="separator"]', prop: 'border-color', usage: 'Separators' },
      { sel: 'hr, [class*="separator"], [class*="divider"], [role="separator"]', prop: 'background-color', usage: 'Separators' },
      { sel: '[class*="tag"], [class*="Tag"], [class*="pill"], [class*="badge"], [class*="Badge"], [class*="label"]', prop: 'background-color', usage: 'Tags & badges' },
      { sel: '[class*="tag"], [class*="Tag"], [class*="pill"], [class*="badge"], [class*="Badge"], [class*="label"]', prop: 'color', usage: 'Tags & badges' },
      { sel: 'h1 + p, [class*="deck"], [class*="Deck"], [class*="lead"], [class*="Lead"], [class*="standfirst"], [class*="subtitle"]', prop: 'color', usage: 'Article deck' },
    ];

    for (const { sel, prop, usage } of colorSources) {
      const els = document.querySelectorAll(sel);
      for (let i = 0; i < Math.min(els.length, 20); i++) {
        const c = parseColor(getCS(els[i], prop));
        trackColor(c, usage);
      }
    }

    // Classify colors
    const allColors = Object.values(colorUsages).sort((a, b) => b.count - a.count);
    const accentColors = allColors.filter(c => !isGray(c.color) && luminance(c.color) > 20 && luminance(c.color) < 240);
    const textColors = allColors.filter(c => isGray(c.color) && luminance(c.color) < 180).sort((a, b) => luminance(a.color) - luminance(b.color));
    const bgColors = allColors.filter(c => luminance(c.color) > 200).sort((a, b) => b.count - a.count);
    const darkBgColors = allColors.filter(c => isGray(c.color) && luminance(c.color) < 60);

    function buildColorEntry(entry, name) {
      if (!entry) return null;
      return { name, hex: entry.color.hex, rgb: entry.color.rgb, usage: entry.usages, source: 'extracted' };
    }
    // Mark a hardcoded fallback so downstream consumers can warn instead of pretending it was extracted.
    function fallbackColor(name, hex, rgb, usage) {
      return { name, hex, rgb, usage, source: 'fallback' };
    }

    // Detect accent-specific colors
    const yellowColors = accentColors.filter(c => c.color.r > 180 && c.color.g > 140 && c.color.b < 80);
    const redColors = accentColors.filter(c => c.color.r > 180 && c.color.g < 100 && c.color.b < 100);
    const greenColors = accentColors.filter(c => c.color.g > 100 && c.color.r < 100 && c.color.b < 100);
    const blueColors = accentColors.filter(c => c.color.b > 150 && c.color.r < 100 && c.color.g < 180);

    const colors = {
      primary: buildColorEntry(accentColors[0], 'Primary Accent') || fallbackColor('Default Blue', '#2196F3', 'rgb(33, 150, 243)', []),
      text: {
        primary: buildColorEntry(textColors[0], 'Primary Text') || fallbackColor('Near Black', '#1A1A2E', 'rgb(26, 26, 46)', ['Headlines']),
        secondary: buildColorEntry(textColors[Math.floor(textColors.length * 0.4)] || textColors[1], 'Secondary Text') || fallbackColor('Dark Gray', '#4A4A5A', 'rgb(74, 74, 90)', ['Body text']),
        tertiary: buildColorEntry(textColors[Math.floor(textColors.length * 0.7)] || textColors[2], 'Tertiary Text') || fallbackColor('Medium Gray', '#8A8A9A', 'rgb(138, 138, 154)', ['Timestamps']),
      },
      backgrounds: {
        base: buildColorEntry(bgColors.find(c => luminance(c.color) > 245), 'White') || fallbackColor('White', '#FFFFFF', 'rgb(255, 255, 255)', ['Page background']),
        section: buildColorEntry(bgColors.find(c => luminance(c.color) > 230 && luminance(c.color) < 250), 'Section') || fallbackColor('Off-White', '#F7F9FC', 'rgb(247, 249, 252)', ['Section backgrounds']),
        secondary: buildColorEntry(bgColors.find(c => luminance(c.color) > 210 && luminance(c.color) < 240), 'Secondary') || null,
        dark: buildColorEntry(darkBgColors[0], 'Dark Background') || null,
      },
      accents: {}
    };

    if (yellowColors.length > 0) colors.accents.warning_yellow = buildColorEntry(yellowColors[0], 'Warning Yellow');
    if (redColors.length > 0) colors.accents.negative_red = buildColorEntry(redColors[0], 'Negative Red');
    if (greenColors.length > 0) colors.accents.positive_green = buildColorEntry(greenColors[0], 'Positive Green');
    if (blueColors.length > 0) colors.accents.info_blue = buildColorEntry(blueColors[0], 'Info Blue');
    if (accentColors.length > 1) colors.secondary = buildColorEntry(accentColors[1], 'Secondary Accent');

    // Use theme-color as override if it looks like a strong brand signal
    if (themeColor) {
      const tc = parseColor(themeColor);
      if (tc && !isGray(tc)) {
        colors.primary = { name: 'Theme Color', hex: tc.hex, rgb: tc.rgb, usage: ['Theme color meta tag', ...(colors.primary.usage || [])] };
      }
    }

    // ---- FONTS ----
    const fontCounts = {};
    const fontElementMap = {};
    function trackFont(el, role) {
      const cs = window.getComputedStyle(el);
      const family = cleanFont(cs.fontFamily.split(',')[0]);
      if (!family || family === 'inherit' || family === 'initial' || family.startsWith('-')) return;
      fontCounts[family] = (fontCounts[family] || 0) + 1;
      if (!fontElementMap[family]) fontElementMap[family] = [];
      if (!fontElementMap[family].includes(role)) fontElementMap[family].push(role);
    }

    document.querySelectorAll('h1, h2, h3').forEach(el => trackFont(el, 'Headlines'));
    document.querySelectorAll('p').forEach(el => trackFont(el, 'Body text'));
    document.querySelectorAll('nav a, [role="navigation"] a').forEach(el => trackFont(el, 'Navigation'));
    document.querySelectorAll('button, .btn, [role="button"]').forEach(el => trackFont(el, 'Buttons'));
    document.querySelectorAll('time, .date, [class*="meta"], [class*="timestamp"]').forEach(el => trackFont(el, 'Meta text'));
    document.querySelectorAll('figcaption, .caption').forEach(el => trackFont(el, 'Captions'));

    const sortedFonts = Object.entries(fontCounts).sort((a, b) => b[1] - a[1]);
    const genericFonts = ['Arial', 'Helvetica', 'sans-serif', 'serif', 'monospace', 'system-ui', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS'];
    const customFonts = sortedFonts.filter(([f]) => !genericFonts.includes(f));
    const genericInUse = sortedFonts.filter(([f]) => genericFonts.includes(f));
    const fallbackFonts = genericInUse.map(([f]) => f).slice(0, 3);

    const fonts = { primary: null, secondary: null, tertiary: [], type_scale: {} };

    // Pick primary font from the most-used custom font. If the publisher truly uses only
    // generic fonts (Arial/Helvetica/etc.), report THAT honestly — don't manufacture a
    // custom font from nothing.
    const primaryEntry = customFonts[0] || genericInUse[0];
    if (primaryEntry) {
      fonts.primary = {
        family: primaryEntry[0],
        fallbacks: fallbackFonts.length > 0 ? fallbackFonts : ['sans-serif'],
        weights: {},
        usage: (fontElementMap[primaryEntry[0]] || []).join(', '),
        source: 'extracted',
        is_generic: genericFonts.includes(primaryEntry[0])
      };
      const h1 = document.querySelector('h1');
      const p = document.querySelector('p');
      if (h1) fonts.primary.weights.bold = parseInt(getCS(h1, 'font-weight')) || 700;
      if (p) fonts.primary.weights.regular = parseInt(getCS(p, 'font-weight')) || 400;
    } else {
      fonts.primary = { family: 'sans-serif', fallbacks: ['sans-serif'], weights: { regular: 400, bold: 700 }, usage: '', source: 'fallback', is_generic: true };
    }

    const secondaryEntry = customFonts[1] || (customFonts[0] ? genericInUse[0] : genericInUse[1]);
    if (secondaryEntry && secondaryEntry[0] !== fonts.primary.family) {
      const secFamily = secondaryEntry[0];
      const secIsSerif = /serif|Georgia|Times|Merriweather|Playfair|Lora|Roboto\s*Serif/i.test(secFamily);
      fonts.secondary = {
        family: secFamily,
        weight: 600,
        style: secIsSerif ? 'italic' : 'normal',
        usage: (fontElementMap[secFamily] || []).join(', '),
        source: 'extracted'
      };
    }

    if (customFonts.length > 2) {
      fonts.tertiary = customFonts.slice(2, 5).map(([f]) => ({
        family: f,
        usage: (fontElementMap[f] || []).join(', '),
        source: 'extracted'
      }));
    }

    // Type scale extraction
    const typeScaleSelectors = {
      section_headings: { sel: 'h2, .section-title, [class*="section-head"]', fallback: { size: '36px', weight: 700 } },
      article_title_hero: { sel: 'h1, .headline, [class*="headline"]', fallback: { size: '34px', weight: 700 } },
      article_title_card: { sel: '.card h3, .card-title, [class*="card"] h3', fallback: { size: '22px', weight: 700 } },
      article_lead: { sel: '.lead, .deck, .article-lead, [class*="subtitle"]', fallback: { size: '18px', weight: 700 } },
      article_body: { sel: 'article p, .article-body p, .story-body p', fallback: { size: '18px', weight: 400 } },
      navigation: { sel: 'nav a, [role="navigation"] a', fallback: { size: '15px', weight: 400 } },
      utility_bar: { sel: '.utility a, .topbar a, [class*="utility"] a', fallback: { size: '13px', weight: 400 } },
      category_pills: { sel: '[class*="pill"], [class*="chip"], [class*="tag"], [class*="filter"] a', fallback: { size: '14px', weight: 400 } },
      buttons: { sel: 'button, .btn, [role="button"]', fallback: { size: '15px', weight: 700 } },
      meta_text: { sel: 'time, .date, [class*="meta"], [class*="timestamp"], figcaption', fallback: { size: '13px', weight: 400 } },
    };

    for (const [role, { sel, fallback }] of Object.entries(typeScaleSelectors)) {
      const el = document.querySelector(sel);
      if (el) {
        const cs = window.getComputedStyle(el);
        fonts.type_scale[role] = {
          size: cs.fontSize,
          weight: parseInt(cs.fontWeight) || fallback.weight,
          family: cleanFont(cs.fontFamily.split(',')[0]),
          line_height: cs.lineHeight === 'normal' ? undefined : cs.lineHeight,
          text_transform: cs.textTransform !== 'none' ? cs.textTransform : undefined,
          letter_spacing: cs.letterSpacing !== 'normal' && cs.letterSpacing !== '0px' ? cs.letterSpacing : undefined,
          color: parseColor(cs.color)?.hex,
          style: cs.fontStyle !== 'normal' ? cs.fontStyle : undefined,
          source: 'extracted',
          matched_selector: sel,
        };
        Object.keys(fonts.type_scale[role]).forEach(k => {
          if (fonts.type_scale[role][k] === undefined) delete fonts.type_scale[role][k];
        });
      } else {
        // Selector did not match anything on the page. Record the fallback but mark
        // it so the analysis report can warn that this token was not extracted.
        fonts.type_scale[role] = {
          ...fallback,
          family: fonts.primary?.family || 'sans-serif',
          source: 'fallback',
          attempted_selector: sel,
        };
      }
    }

    // Detect opinion/editorial font (serif + italic in certain sections)
    const opinionEls = document.querySelectorAll('[class*="opinion"] h2, [class*="opinion"] h3, [class*="meinung"] h2, [class*="editorial"] h2, [class*="column"] h2');
    if (opinionEls.length > 0) {
      const cs = window.getComputedStyle(opinionEls[0]);
      fonts.type_scale.opinion_headline = {
        size: cs.fontSize,
        weight: parseInt(cs.fontWeight) || 600,
        family: cleanFont(cs.fontFamily.split(',')[0]),
        style: 'italic'
      };
    }

    // ---- BRAND VOICE ----
    const brand_voice = {
      language: lang,
      headline_style: { format: 'sentence case', case: 'sentence case' },
      content_labels: {},
      content_distinction: {}
    };

    // Analyze headline patterns
    const headlines = Array.from(document.querySelectorAll('h1, h2, h3')).map(el => el.textContent.trim()).filter(t => t.length > 10).slice(0, 20);
    if (headlines.length > 0) {
      const colonCount = headlines.filter(h => h.includes(':')).length;
      if (colonCount > headlines.length * 0.3) {
        brand_voice.headline_style.pattern = 'Topic colon pattern (e.g., "Category: Headline text")';
      }
      const upperCount = headlines.filter(h => h === h.toUpperCase()).length;
      if (upperCount > headlines.length * 0.5) {
        brand_voice.headline_style.case = 'uppercase';
      }
    }

    // Detect content labels
    const bodyText = (document.body?.textContent || '').toLowerCase();
    const labelPatterns = {
      opinion: ['opinion', 'meinung', 'kommentar', 'editorial', 'op-ed', 'column'],
      live: ['live', 'liveticker', 'live updates', 'live blog'],
      breaking: ['breaking', 'eilmeldung', 'breaking news', 'alert'],
      video: ['video', 'watch'],
      gallery: ['gallery', 'photos', 'bildergalerie'],
      analysis: ['analysis', 'analyse', 'explainer', 'in-depth'],
      sponsored: ['sponsored', 'paid content', 'advertorial', 'anzeige'],
    };
    for (const [label, keywords] of Object.entries(labelPatterns)) {
      if (keywords.some(k => bodyText.includes(k))) {
        brand_voice.content_labels[label] = true;
      }
    }

    // Detect news vs opinion distinction
    if (brand_voice.content_labels.opinion && fonts.secondary) {
      brand_voice.content_distinction = {
        news: { typography: fonts.primary?.family + ' Bold, sans-serif', description: 'Factual, objective reporting' },
        opinion: { label: 'Opinion/Editorial', typography: fonts.secondary.family + ' ' + fonts.secondary.style, description: 'Editorial content with distinct serif-italic styling' }
      };
    }

    // ---- PHOTO STYLE ----
    const photo_style = {
      thumbnail_format: { aspect_ratio: '16:9', border_radius: '0px' },
      video_thumbnails: { indicator: null, indicator_color: null },
      author_photos: { shape: null, size: null }
    };

    // Analyze image dimensions for common aspect ratios
    const images = Array.from(document.querySelectorAll('article img, .card img, [class*="thumbnail"] img, [class*="teaser"] img'));
    if (images.length > 0) {
      const ratios = images.slice(0, 10).map(img => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w && h && h > 0) return Math.round((w / h) * 10) / 10;
        return null;
      }).filter(Boolean);
      if (ratios.length > 0) {
        const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        if (avgRatio > 1.6) photo_style.thumbnail_format.aspect_ratio = '16:9';
        else if (avgRatio > 1.2) photo_style.thumbnail_format.aspect_ratio = '4:3';
        else if (avgRatio > 0.9) photo_style.thumbnail_format.aspect_ratio = '1:1';
        else photo_style.thumbnail_format.aspect_ratio = '3:4';
      }
      // Border radius from first image
      const imgBr = getCS(images[0], 'border-radius');
      if (imgBr && imgBr !== '0px') photo_style.thumbnail_format.border_radius = imgBr;
    }

    // Video indicator detection
    const videoEls = document.querySelectorAll('[class*="video"] svg, [class*="play"] svg, [class*="video-icon"]');
    if (videoEls.length > 0) {
      photo_style.video_thumbnails.indicator = 'Play button icon';
      const playColor = parseColor(getCS(videoEls[0], 'color') || getCS(videoEls[0], 'fill'));
      if (playColor) photo_style.video_thumbnails.indicator_color = playColor.hex;
    }

    // Author photos
    const authorImgs = document.querySelectorAll('[class*="author"] img, [class*="avatar"] img, .byline img');
    if (authorImgs.length > 0) {
      const br = getCS(authorImgs[0], 'border-radius');
      photo_style.author_photos.shape = (br === '50%' || br === '9999px' || parseInt(br) > 40) ? 'circular' : 'square';
      photo_style.author_photos.size = getCS(authorImgs[0], 'width');
    }

    // ---- GRAPHICS / BADGES ----
    const graphics = { style: 'Minimal — relies on photography and typography', elements: [] };

    // Detect badge-like elements
    const badgeSelectors = [
      '[class*="badge"]', '[class*="label"]', '[class*="tag"]', '[class*="pill"]',
      '[class*="live"]', '[class*="breaking"]', '[class*="ticker"]', '[class*="new"]'
    ];
    const seenBadges = new Set();
    for (const sel of badgeSelectors) {
      document.querySelectorAll(sel).forEach(el => {
        const text = el.textContent.trim();
        if (text.length > 0 && text.length < 30 && !seenBadges.has(text)) {
          seenBadges.add(text);
          const cs = window.getComputedStyle(el);
          const bg = parseColor(cs.backgroundColor);
          const color = parseColor(cs.color);
          if (bg || color) {
            graphics.elements.push({
              name: text,
              description: `Badge/label element`,
              background_color: bg?.hex || 'transparent',
              text_color: color?.hex || undefined
            });
          }
        }
      });
    }

    // ---- ICONS ----
    const icons = {
      style: 'SVG-based',
      count_detected: document.querySelectorAll('svg').length,
      social_media_icons: { platforms: [], placement: 'Footer' }
    };

    // Detect social media links
    const socialPatterns = {
      Facebook: /facebook\.com|fb\.com/i,
      'X (Twitter)': /twitter\.com|x\.com/i,
      Instagram: /instagram\.com/i,
      YouTube: /youtube\.com/i,
      LinkedIn: /linkedin\.com/i,
      TikTok: /tiktok\.com/i,
      Spotify: /spotify\.com/i,
      Pinterest: /pinterest\.com/i,
    };
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href || '';
      for (const [platform, regex] of Object.entries(socialPatterns)) {
        if (regex.test(href) && !icons.social_media_icons.platforms.includes(platform)) {
          icons.social_media_icons.platforms.push(platform);
        }
      }
    });

    // ---- LAYOUT PATTERNS ----
    const layout_patterns = {
      grid: 'Unknown',
      header: { layers: [] },
      content_cards: {},
      footer: { sections: [] }
    };

    // Header layers
    if (headerEl) {
      const children = headerEl.children;
      layout_patterns.header.layers = Array.from(children).slice(0, 5).map(child => {
        const text = child.textContent.trim().substring(0, 50);
        const tag = child.tagName.toLowerCase();
        return `${tag}: ${text || '(visual element)'}`;
      });
    }

    // Grid detection
    const mainContent = document.querySelector('main, [role="main"], #content, .content, article');
    if (mainContent) {
      const sidebar = document.querySelector('aside, [role="complementary"], .sidebar, [class*="sidebar"]');
      layout_patterns.grid = sidebar ? 'Two-column layout (main content + sidebar)' : 'Single-column layout';
    }

    // Footer sections
    const footer = document.querySelector('footer, [role="contentinfo"]');
    if (footer) {
      const headings = footer.querySelectorAll('h2, h3, h4, dt, strong');
      layout_patterns.footer.sections = Array.from(headings).slice(0, 10).map(h => h.textContent.trim()).filter(t => t.length > 0 && t.length < 60);
    }

    // ---- SPACING ----
    const spacing = {};
    // Border radius from cards/images
    const cardEls = document.querySelectorAll('.card, [class*="card"], [class*="teaser"]');
    if (cardEls.length > 0) {
      spacing.card_border_radius = getCS(cardEls[0], 'border-radius');
    }
    // Container max-width
    const containers = document.querySelectorAll('.container, [class*="container"], main, [role="main"]');
    for (const c of containers) {
      const mw = getCS(c, 'max-width');
      if (mw && mw !== 'none' && parseInt(mw) >= 900 && parseInt(mw) <= 1600) {
        spacing.container_max_width = mw;
        break;
      }
    }
    // Grid gaps
    const gridEls = document.querySelectorAll('[style*="grid"], [class*="grid"]');
    for (const g of gridEls) {
      const gap = getCS(g, 'gap') || getCS(g, 'grid-gap');
      if (gap && gap !== 'normal' && gap !== '0px') {
        spacing.grid_gap = gap;
        break;
      }
    }

    // Extraction-quality summary: walk every token tagged with `source` and count
    // how many came from the page vs. a fallback. The CLI uses this to refuse to
    // produce a "successful" report when too much of the brand kit was fabricated.
    const extractionQuality = (() => {
      const tally = { extracted: 0, fallback: 0, fallbackTokens: [] };
      const visit = (path, value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) { value.forEach((v, i) => visit(`${path}[${i}]`, v)); return; }
        if (typeof value.source === 'string') {
          if (value.source === 'fallback') {
            tally.fallback++;
            tally.fallbackTokens.push(path);
          } else if (value.source === 'extracted') {
            tally.extracted++;
          }
        }
        for (const k of Object.keys(value)) {
          if (k === 'usage' || k === 'matched_selector' || k === 'attempted_selector') continue;
          visit(path ? `${path}.${k}` : k, value[k]);
        }
      };
      visit('colors', colors);
      visit('fonts', fonts);
      const total = tally.extracted + tally.fallback;
      const ratio = total === 0 ? 0 : tally.extracted / total;
      return {
        extracted_token_count: tally.extracted,
        fallback_token_count: tally.fallback,
        total_tokens: total,
        extraction_ratio: Number(ratio.toFixed(2)),
        fallback_tokens: tally.fallbackTokens,
      };
    })();

    // ---- HEADER STRUCTURE (for prototype rendering) ----
    // Capture the real header background colour and whether it has a
    // narrower utility bar above the main nav — many publishers (t-online,
    // walla, Leckerschmecker) stack a small utility strip on top of the
    // main logo bar, and the prototype should mirror that.
    if (headerEl) {
      // Sticky / translucent headers report `rgba(0,0,0,0)` as their
      // computed background. Walk the immediate children to find the
      // first one with an opaque colour — that's the actual visible bar.
      function resolveHeaderBg(root) {
        const own = parseColor(window.getComputedStyle(root).backgroundColor);
        if (own) return own;
        for (const child of root.children) {
          const c = parseColor(window.getComputedStyle(child).backgroundColor);
          if (c) return c;
        }
        // One more level down — modern headers nest a wrapper.
        for (const child of root.children) {
          for (const grand of child.children) {
            const c = parseColor(window.getComputedStyle(grand).backgroundColor);
            if (c) return c;
          }
        }
        return null;
      }
      const headerBg = resolveHeaderBg(headerEl);
      layout_patterns.header.background_color = headerBg?.hex || null;
      layout_patterns.header.is_dark = headerBg ? luminance(headerBg) < 128 : null;

      // Utility bar: a thin first-child strip with a distinct background.
      const firstChild = headerEl.children[0];
      if (firstChild && firstChild.offsetHeight && firstChild.offsetHeight < 48) {
        const fcCS = window.getComputedStyle(firstChild);
        const fcBg = parseColor(fcCS.backgroundColor);
        if (fcBg && (!headerBg || fcBg.hex !== headerBg.hex)) {
          layout_patterns.header.utility_bar = {
            background_color: fcBg.hex,
            text_color: parseColor(fcCS.color)?.hex || null,
            height: firstChild.offsetHeight,
            is_dark: luminance(fcBg) < 128,
          };
        }
      }

      // Accent rule under the nav (t-online's magenta line, walla's blue line).
      const underline = Array.from(headerEl.children).reverse().find((el) => {
        return el.offsetHeight > 0 && el.offsetHeight <= 6;
      });
      if (underline) {
        const ub = parseColor(window.getComputedStyle(underline).backgroundColor);
        if (ub && !isGray(ub)) {
          layout_patterns.header.accent_rule_color = ub.hex;
        }
      }
    }

    // ---- BUTTON STYLE (for CTA rendering) ----
    // Find a prominent button-shaped element and capture its real
    // border-radius / padding / typography so the prototype's CTA pill
    // matches the publisher's actual button language.
    const buttonCandidates = document.querySelectorAll(
      'button[type="submit"], button[class*="primary"], button[class*="Primary"], ' +
      'button[class*="cta"], a[class*="cta"], a[class*="CTA"], ' +
      '[class*="Button-primary"], [class*="btn-primary"], [class*="ButtonPrimary"], ' +
      'button:not([class*="close"]):not([aria-label*="close" i])'
    );
    let pickedButton = null;
    for (const btn of buttonCandidates) {
      const cs = window.getComputedStyle(btn);
      const bg = parseColor(cs.backgroundColor);
      // Skip transparent / borderless "ghost" buttons — we want the
      // styled CTA, not a hamburger.
      if (!bg || luminance(bg) > 240) continue;
      if (btn.offsetHeight < 28 || btn.offsetWidth < 60) continue;
      pickedButton = btn;
      break;
    }
    const buttons = { primary: null };
    if (pickedButton) {
      const cs = window.getComputedStyle(pickedButton);
      buttons.primary = {
        background_color: parseColor(cs.backgroundColor)?.hex || null,
        text_color: parseColor(cs.color)?.hex || null,
        border_radius: cs.borderRadius,
        padding: cs.padding,
        font_size: cs.fontSize,
        font_weight: parseInt(cs.fontWeight) || 700,
        text_transform: cs.textTransform === 'none' ? null : cs.textTransform,
        letter_spacing: cs.letterSpacing === 'normal' ? null : cs.letterSpacing,
        source: 'extracted',
      };
    } else {
      buttons.primary = {
        background_color: null, text_color: null,
        border_radius: '6px', padding: '10px 18px',
        font_size: '14px', font_weight: 700,
        text_transform: null, letter_spacing: null,
        source: 'fallback',
      };
    }

    // ---- COLOR VARIANTS + GRADIENTS ----
    function darkenHex(hex, pct) {
      const c = parseColor(hex);
      if (!c) return null;
      const f = (100 - pct) / 100;
      return rgbToHex(c.r * f, c.g * f, c.b * f);
    }
    if (colors.primary?.hex) {
      colors.primary_variants = {
        darken_5: { hex: darkenHex(colors.primary.hex, 5), name: 'Darker primary', usage: 'Hover states', source: 'derived' },
        darken_10: { hex: darkenHex(colors.primary.hex, 12), name: 'Deepest primary', usage: 'Active/pressed states', source: 'derived' },
      };
    }
    // Sniff for inline / computed linear-gradient backgrounds — they tend to
    // appear on hero overlays and premium CTAs.
    const gradients = { detected: [] };
    const sampleEls = document.querySelectorAll('header, [class*="hero"], [class*="Hero"], button, [class*="cta"], [class*="banner"]');
    for (let i = 0; i < Math.min(sampleEls.length, 30); i++) {
      const bgImage = window.getComputedStyle(sampleEls[i]).backgroundImage;
      if (bgImage && bgImage.startsWith('linear-gradient(')) {
        if (!gradients.detected.includes(bgImage)) gradients.detected.push(bgImage);
        if (gradients.detected.length >= 3) break;
      }
    }
    if (gradients.detected.length > 0) {
      colors.gradients = {
        primary: { value: gradients.detected[0], source: 'extracted' },
      };
      if (gradients.detected[1]) colors.gradients.secondary = { value: gradients.detected[1], source: 'extracted' };
      if (gradients.detected[2]) colors.gradients.tertiary = { value: gradients.detected[2], source: 'extracted' };
    }

    // ---- SPONSORED LABEL ----
    // Walk badge-like elements (the same selectors as graphics.badges) plus
    // ARIA labels, looking for the publisher's own word for "sponsored". A
    // German page says "Anzeige", Spanish "Patrocinado", etc. Falling back to
    // English in the prototype produces obviously-foreign cards on a German
    // site; this lets us mirror the publisher's own copy.
    const sponsoredCandidates = [];
    const labelSelectors = '[class*="sponsor" i], [class*="anzeige" i], [class*="advert" i], [class*="ad-label" i], [class*="paid"i], [aria-label*="sponsor" i], [aria-label*="anzeige" i]';
    document.querySelectorAll(labelSelectors).forEach((el) => {
      const text = (el.textContent || '').trim();
      if (text && text.length <= 24) sponsoredCandidates.push(text);
      const aria = (el.getAttribute('aria-label') || '').trim();
      if (aria && aria.length <= 24) sponsoredCandidates.push(aria);
    });
    const sponsoredLabel = (() => {
      // Prefer a label that actually appears as visible text. Strip emoji/dots.
      const cleaned = sponsoredCandidates
        .map((s) => s.replace(/[•·:|—–]+/g, ' ').trim())
        .filter((s) => s.length > 0 && s.length <= 20 && !/^\d/.test(s));
      if (cleaned.length === 0) return null;
      // Pick the most common
      const counts = {};
      for (const s of cleaned) counts[s] = (counts[s] || 0) + 1;
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    })();
    if (sponsoredLabel) brand_voice.sponsored_label = sponsoredLabel;

    // ---- CONTENT CATEGORIES (from navigation) ----
    // Pull a clean array of section names so the brand kit reads as a
    // human-curated description of what the publisher covers — the
    // gold-standard kit lists "Rezepte / Schnelle Rezepte / Magazin / …".
    const navAnchors = Array.from(document.querySelectorAll(
      'nav a, [role="navigation"] a, header nav a',
    ));
    const seenCats = new Set();
    const categories = [];
    for (const a of navAnchors) {
      const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 2 || text.length > 30) continue;
      if (/login|sign|abo|subscribe|search|menu|account|kontakt|impressum|cookie/i.test(text)) continue;
      const key = text.toLowerCase();
      if (seenCats.has(key)) continue;
      seenCats.add(key);
      categories.push(text);
      if (categories.length >= 10) break;
    }
    if (categories.length > 0) brand_voice.content_categories = categories;

    // ---- BUTTON VARIANTS (outline + soft CTA) ----
    // The prototype's feed has multiple CTA shapes — a primary pill, a
    // newsletter "soft" pill on a light bg, and outline secondary buttons.
    // Capture each so the rendered prototype can mirror the publisher's
    // hierarchy instead of using a single filled pill for everything.
    function classifyButton(el) {
      const cs = window.getComputedStyle(el);
      const bg = parseColor(cs.backgroundColor);
      const borderColor = parseColor(cs.borderColor);
      const borderWidth = parseFloat(cs.borderWidth) || 0;
      return {
        cs,
        bg,
        borderColor,
        borderWidth,
        transparent: !bg,
        looksOutline: !bg && borderWidth >= 1 && !!borderColor,
        looksSoft: !!bg && luminance(bg) > 200 && !isGray(bg),
        looksFilled: !!bg && luminance(bg) < 200,
      };
    }
    const allButtonCandidates = document.querySelectorAll(
      'button, a[class*="btn" i], a[class*="cta" i], a[class*="Button" i], [role="button"]',
    );
    let pickedOutline = null;
    let pickedSoft = null;
    for (const btn of allButtonCandidates) {
      if (btn === pickedButton) continue;
      if (btn.offsetHeight < 28 || btn.offsetWidth < 60) continue;
      const cls = (btn.className?.baseVal || btn.className || '');
      if (/\b(close|toggle|menu|hamburger|burger|nav)\b/i.test(cls)) continue;
      const info = classifyButton(btn);
      if (!pickedOutline && info.looksOutline) pickedOutline = { el: btn, ...info };
      else if (!pickedSoft && info.looksSoft) pickedSoft = { el: btn, ...info };
      if (pickedOutline && pickedSoft) break;
    }
    if (pickedOutline) {
      const cs = pickedOutline.cs;
      buttons.outline = {
        background_color: 'transparent',
        text_color: parseColor(cs.color)?.hex || null,
        border: `${cs.borderTopWidth} solid ${pickedOutline.borderColor?.hex || 'currentColor'}`,
        border_radius: cs.borderRadius,
        padding: cs.padding,
        font_weight: parseInt(cs.fontWeight) || 600,
        source: 'extracted',
      };
    }
    if (pickedSoft) {
      const cs = pickedSoft.cs;
      buttons.soft_cta = {
        background_color: pickedSoft.bg.hex,
        text_color: parseColor(cs.color)?.hex || null,
        border_radius: cs.borderRadius,
        padding: cs.padding,
        usage: 'Newsletter signups, secondary actions',
        source: 'extracted',
      };
    }

    // ---- SHADOWS ----
    // Capture up to three distinct non-trivial box-shadow values from cards,
    // hero panels, and CTAs. Maps to gold-standard `shadows.natural / deep /
    // sharp`. We don't try to classify by intent — the array order is just
    // observed prominence, which the template can label naturally.
    const shadowSamples = [];
    const seenShadows = new Set();
    document.querySelectorAll('[class*="card" i], [class*="hero" i], button, [class*="cta" i], [class*="modal" i], [class*="popup" i]')
      .forEach((el) => {
        if (shadowSamples.length >= 8) return;
        const s = window.getComputedStyle(el).boxShadow;
        if (!s || s === 'none') return;
        if (seenShadows.has(s)) return;
        seenShadows.add(s);
        shadowSamples.push(s);
      });
    const shadows = {};
    if (shadowSamples[0]) shadows.natural = shadowSamples[0];
    if (shadowSamples[1]) shadows.deep    = shadowSamples[1];
    if (shadowSamples[2]) shadows.sharp   = shadowSamples[2];

    // ---- BORDER-RADIUS SEMANTIC GROUPS ----
    // Different elements typically use different radii (pill buttons, rounded
    // cards, sharp images). Sample each role independently so the brand kit
    // exposes them as semantic tokens.
    const sampleRadius = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = window.getComputedStyle(el).borderRadius;
      if (!r || r === '0px') return null;
      return r;
    };
    const radiusButtons = pickedButton ? window.getComputedStyle(pickedButton).borderRadius : null;
    const border_radius = {};
    if (radiusButtons && radiusButtons !== '0px') border_radius.buttons = radiusButtons;
    const radiusCards = sampleRadius('[class*="card" i], [class*="teaser" i], [class*="tile" i]');
    if (radiusCards) border_radius.cards = radiusCards;
    const radiusImages = (() => {
      const img = document.querySelector('article img, [class*="card" i] img, [class*="thumbnail" i] img');
      if (!img) return null;
      const r = window.getComputedStyle(img).borderRadius;
      return r && r !== '0px' ? r : '0px';
    })();
    if (radiusImages !== null) border_radius.images = radiusImages;
    const radiusOverlays = sampleRadius('[class*="modal" i], [class*="popup" i], [class*="dialog" i], [role="dialog"]');
    if (radiusOverlays) border_radius.overlays = radiusOverlays;

    // ---- WORDMARK LOGO TYPE ----
    // If we never picked an image/svg but have a brand-name-shaped text in
    // the header, classify the logo as a "wordmark" with the rendered font
    // and computed colour. Matches the gold-standard schema and gives the
    // template enough info to render a faithful text-only logo.
    if (!logos.primary.type && logos.primary.text) {
      const wordmarkSrc = headerEl && headerEl.querySelector('a[class*="logo" i], .logo, [class*="brand" i]');
      if (wordmarkSrc) {
        const cs = window.getComputedStyle(wordmarkSrc);
        logos.primary.type = 'wordmark';
        logos.primary.text_color = parseColor(cs.color)?.hex || null;
        logos.primary.font = cleanFont(cs.fontFamily.split(',')[0]);
      }
    }
    // Logo dimensions formatted as "WxH px" — gold-standard format.
    if (logos.primary.width && logos.primary.height) {
      logos.primary.desktop_dimensions =
        `${Math.round(logos.primary.width)}px x ${Math.round(logos.primary.height)}px`;
    }
    // Favicon as an object (matches gold-standard `logos.favicon: {url, color}`)
    // while preserving the legacy `favicon_url` string the older templates expect.
    if (logos.favicon_url) {
      logos.favicon = { url: logos.favicon_url };
      if (colors.primary?.hex) logos.favicon.color = colors.primary.hex;
    }

    // ---- DIVIDER / BORDER COLOR ----
    // Walk hr / separator-like elements to find the publisher's neutral
    // divider colour. Falls back to the section background tint when no
    // explicit hr is present.
    let dividerColor = null;
    document.querySelectorAll('hr, [class*="separator" i], [class*="divider" i], [role="separator"]')
      .forEach((el) => {
        if (dividerColor) return;
        const cs = window.getComputedStyle(el);
        const c = parseColor(cs.borderTopColor) || parseColor(cs.backgroundColor) || parseColor(cs.color);
        if (c && isGray(c) && luminance(c) > 180 && luminance(c) < 250) dividerColor = c;
      });
    if (dividerColor) {
      colors.borders = colors.borders || {};
      colors.borders.divider = {
        name: 'Divider',
        hex: dividerColor.hex,
        rgb: dividerColor.rgb,
        usage: 'Section dividers, hr, table borders',
        source: 'extracted',
      };
    }

    // ---- VARIABLE FONT DETECTION ----
    // Check the loaded @font-face stylesheet rules for entries with
    // `font-weight: <low> <high>` ranges — that's the css signal for a
    // variable font. We can't read every cross-origin sheet, but most
    // publisher fonts ship same-origin or via Google Fonts (CORS-allowed).
    if (fonts.primary?.family) {
      try {
        const fontFamilyLc = fonts.primary.family.toLowerCase();
        for (const sheet of Array.from(document.styleSheets)) {
          let rules;
          try { rules = sheet.cssRules; } catch (_) { continue; }
          if (!rules) continue;
          for (const rule of Array.from(rules)) {
            if (rule.type !== 5 /* FONT_FACE_RULE */) continue;
            const fam = (rule.style.getPropertyValue('font-family') || '').toLowerCase().replace(/['"]/g, '');
            if (!fam || !fam.includes(fontFamilyLc.split(' ')[0])) continue;
            const wt = rule.style.getPropertyValue('font-weight') || '';
            if (/\d+\s+\d+/.test(wt)) {
              fonts.primary.variable = true;
              fonts.primary.weight_range = wt.trim();
            }
            const disp = rule.style.getPropertyValue('font-display');
            if (disp) fonts.primary.font_display = disp.trim();
          }
        }
      } catch (_) { /* same-origin policy or stylesheet access issue */ }
    }

    // ---- WEIGHT INVENTORY (light / medium / semibold / extrabold) ----
    // Look across all rendered text and bucket the actual weights in use,
    // not just the bold/regular fallback. Gold-standard kits expose the
    // full weight ladder so designers can mirror nuance.
    if (fonts.primary?.family) {
      const weights = new Set();
      const sample = document.querySelectorAll('h1, h2, h3, h4, p, a, button, nav a, [class*="byline" i], [class*="caption" i]');
      sample.forEach((el) => {
        const cs = window.getComputedStyle(el);
        const fam = cleanFont(cs.fontFamily.split(',')[0]).toLowerCase();
        if (fam !== fonts.primary.family.toLowerCase()) return;
        const w = parseInt(cs.fontWeight);
        if (Number.isFinite(w) && w >= 100 && w <= 900) weights.add(w);
      });
      // Map raw weight numbers to the gold-standard slot names.
      const slot = (w) => {
        if (w <= 300) return 'light';
        if (w <= 400) return 'regular';
        if (w <= 500) return 'medium';
        if (w <= 600) return 'semibold';
        if (w <= 700) return 'bold';
        return 'extrabold';
      };
      const weightSlots = fonts.primary.weights || {};
      for (const w of weights) weightSlots[slot(w)] = w;
      fonts.primary.weights = weightSlots;
    }

    // System fallback stack — gold-standard exposes this as a separate slot
    // so downstream consumers (CSS export) can emit a proper safe stack.
    fonts.system_fallback = {
      stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
      usage: 'System fallback when the primary font is unavailable',
      source: 'derived',
    };

    // ---- LAYOUT MAX-WIDTHS ----
    // Capture the real container width(s) from the live DOM. Many publishers
    // run a wide site shell with a narrow article column inside; the
    // gold-standard kit lists both with semantic names so the prototype can
    // mirror layout density.
    const widthSamples = (() => {
      const out = {};
      const candidates = [
        ['site_container', 'main, [role="main"], #content, .page, .container'],
        ['article_column', 'article, [class*="article-body" i], [class*="content-body" i]'],
        ['recipe_card_wide', '[class*="recipe" i] [class*="card" i], [class*="recipe-card" i]'],
        ['recipe_header_meta', '[class*="recipe-header" i], [class*="article-header" i]'],
      ];
      for (const [name, sel] of candidates) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const mw = window.getComputedStyle(el).maxWidth;
        const w = parseInt(mw);
        if (Number.isFinite(w) && w >= 480 && w <= 2000) out[name] = mw;
      }
      return out;
    })();
    if (Object.keys(widthSamples).length > 0) {
      layout_patterns.max_widths = widthSamples;
    }

    // Best-effort breakpoint defaults — parsing every @media query is fragile
    // (and many publishers serve theme-specific stylesheets via SSR), so we
    // emit the most common Bootstrap/Tailwind breakpoints unless the page
    // exposes its own via a CSS custom property.
    const rootStyle = window.getComputedStyle(document.documentElement);
    const mobileBp = rootStyle.getPropertyValue('--breakpoint-mobile').trim();
    const tabletBp = rootStyle.getPropertyValue('--breakpoint-tablet').trim();
    const desktopBp = rootStyle.getPropertyValue('--breakpoint-desktop').trim();
    layout_patterns.breakpoints = {
      mobile: mobileBp || '768px',
      tablet: tabletBp || '1024px',
      desktop: desktopBp || '1200px',
      source: (mobileBp || tabletBp || desktopBp) ? 'extracted' : 'derived',
    };

    // ---- SPACING SCALE ----
    // Pull common spacing values from card grid gaps, padding, and CSS
    // variables. Gives downstream consumers a sense of the publisher's
    // rhythm.
    const spacingScale = {};
    const gapEl = document.querySelector('[class*="grid" i], [style*="grid"], main');
    if (gapEl) {
      const cs = window.getComputedStyle(gapEl);
      const gap = cs.gap || cs.columnGap;
      if (gap && gap !== 'normal') spacingScale.column_gap = gap;
      const pad = cs.padding;
      if (pad && pad !== '0px') spacingScale.container_padding = pad;
    }
    const cardEl = document.querySelector('[class*="card" i]');
    if (cardEl) {
      const cs = window.getComputedStyle(cardEl);
      if (cs.padding && cs.padding !== '0px') spacingScale.card_padding = cs.padding;
    }
    if (Object.keys(spacingScale).length > 0) {
      layout_patterns.spacing = { ...(layout_patterns.spacing || {}), ...spacingScale };
    }

    // ---- HEADER LAYERS — descriptive strings ----
    // The legacy `layout_patterns.header.layers` was raw "div: text" dumps.
    // Replace with human-readable layer descriptions so the brand kit reads
    // like the gold-standard ("Top bar (darkest green #04361d)", etc.).
    if (headerEl) {
      const layerDescs = [];
      const children = Array.from(headerEl.children).slice(0, 4);
      for (const child of children) {
        const cs = window.getComputedStyle(child);
        const bg = parseColor(cs.backgroundColor);
        const tag = child.tagName.toLowerCase();
        const hasNav = !!child.querySelector('nav, [role="navigation"]');
        const hasLogo = !!child.querySelector('img, svg, [class*="logo" i]');
        const role = hasNav ? 'Navigation bar'
                   : hasLogo ? 'Main header'
                   : child.offsetHeight < 40 ? 'Top utility bar'
                   : 'Header section';
        const bgHex = bg ? bg.hex : 'transparent';
        layerDescs.push(`${role} (${tag}, bg ${bgHex})`);
      }
      if (layerDescs.length > 0) {
        layout_patterns.header.layers = layerDescs;
        layout_patterns.header.style = layout_patterns.header.is_dark
          ? 'Dark sticky header, light text'
          : 'Light sticky header, dark text';
      }
    }

    return { brand, logos, colors, fonts, brand_voice, photo_style, graphics, icons, layout_patterns, spacing, buttons, shadows, border_radius, extraction_quality: extractionQuality };
  });

  // Add metadata
  extracted.metadata = {
    analysis_date: new Date().toISOString().split('T')[0],
    source_url: url,
    analysis_method: 'Automated web crawling with Puppeteer computed style extraction',
    extraction_quality: extracted.extraction_quality,
  };

  return extracted;
}

/**
 * Extract article content from the page
 * @param {import('puppeteer-core').Page} page
 * @returns {Promise<object>}
 */
async function extractContent(page) {
  return page.evaluate(() => {
    function getMeta(prop) {
      const el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
      return el ? (el.content || '').trim() : '';
    }

    const h1 = document.querySelector('h1');
    const ogTitle = getMeta('og:title');

    const content = {
      headline: ogTitle || (h1 ? h1.textContent.trim() : 'Untitled Article'),
      deck: '',
      byline: '',
      date: '',
      heroImage: getMeta('og:image'),
      heroCaption: '',
      paragraphs: [],
      categories: [],
      url: window.location.href,
      siteName: getMeta('og:site_name') || document.title.split(/[|\-–—]/)[0].trim()
    };

    // Deck / subtitle
    const deckEl = document.querySelector('.deck, .subtitle, .subheadline, .article-dek, [class*="subtitle"], [class*="deck"]');
    if (deckEl) content.deck = deckEl.textContent.trim();
    else {
      const ogDesc = getMeta('og:description');
      if (ogDesc) content.deck = ogDesc;
    }

    // Byline
    const authorMeta = getMeta('author');
    const authorEl = document.querySelector('[class*="author"], [rel="author"], .byline, [class*="byline"]');
    content.byline = authorMeta || (authorEl ? authorEl.textContent.trim().replace(/^by\s+/i, '') : 'Staff Writer');

    // Date
    const timeEl = document.querySelector('time[datetime], [class*="date"], [class*="timestamp"]');
    if (timeEl) {
      const dt = timeEl.getAttribute('datetime') || timeEl.textContent.trim();
      try {
        content.date = new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      } catch(e) {
        content.date = dt;
      }
    }
    if (!content.date) content.date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Hero caption
    const captionEl = document.querySelector('figcaption, .caption, [class*="caption"]');
    if (captionEl) content.heroCaption = captionEl.textContent.trim();

    // Paragraphs
    const articleBody = document.querySelector('article, [class*="article-body"], [class*="story-body"], [class*="content-body"]') || document.body;
    if (articleBody) {
      articleBody.querySelectorAll('p').forEach(p => {
        const text = p.textContent.trim();
        if (text.length > 40) content.paragraphs.push(text);
      });
    }
    if (content.paragraphs.length === 0) {
      content.paragraphs = [content.deck || 'Article content would appear here in the full prototype.'];
    }

    // Categories / breadcrumbs
    const breadcrumbs = document.querySelectorAll('[class*="breadcrumb"] a, nav[aria-label*="breadcrumb"] a');
    if (breadcrumbs.length > 0) {
      content.categories = Array.from(breadcrumbs).map(a => a.textContent.trim()).filter(t => t.length > 0 && t.length < 30);
    }

    return content;
  });
}

/**
 * Extract navigation structure from the page
 * @param {import('puppeteer-core').Page} page
 * @returns {Promise<object>}
 */
async function extractNavigation(page) {
  return page.evaluate(() => {
    const nav = { navLinks: [], footerLinks: [], socialLinks: [] };

    // Pull a link's user-visible label. Many publishers wrap the primary
    // label and a screen-reader / sub-label inside the same <a> ("Weather"
    // + "for the full forecast"); `textContent` concatenates both with no
    // separator and produces gibberish like "Weatherfor the full forecast".
    function isHidden(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
      if (el.getAttribute('aria-hidden') === 'true') return true;
      const cls = el.className && el.className.baseVal !== undefined
        ? el.className.baseVal  // SVG className is an SVGAnimatedString
        : (el.className || '');
      if (/\b(sr-only|visually-hidden|screen-reader|a11y-hidden|hidden-text)\b/i.test(cls)) return true;
      return false;
    }
    function readLinkLabel(a) {
      // 1. Prefer the first non-empty direct text node — usually the
      //    visible label, with any sub-text sitting in a nested span.
      for (const node of a.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent.trim();
          if (t) return t;
        }
      }
      // 2. Join visible text from every descendant, skipping sr-only spans.
      const parts = [];
      const walk = (el) => {
        if (isHidden(el)) return;
        for (const n of el.childNodes) {
          if (n.nodeType === Node.TEXT_NODE) {
            const t = n.textContent.trim();
            if (t) parts.push(t);
          } else if (n.nodeType === Node.ELEMENT_NODE) {
            walk(n);
          }
        }
      };
      walk(a);
      const visible = parts.join(' ').replace(/\s+/g, ' ').trim();
      if (visible) return visible;
      // 3. Last resort: attribute labels or raw textContent.
      const aria = a.getAttribute('aria-label');
      if (aria) return aria.trim();
      const title = a.getAttribute('title');
      if (title) return title.trim();
      return (a.textContent || '').replace(/\s+/g, ' ').trim();
    }

    // Top navigation
    const navEl = document.querySelector('nav, [role="navigation"], header nav');
    if (navEl) {
      const links = navEl.querySelectorAll('a');
      nav.navLinks = Array.from(links).slice(0, 12).map(a => ({
        text: readLinkLabel(a),
        href: a.href
      })).filter(l => l.text.length > 0 && l.text.length < 30);
    }

    // Footer links
    const footer = document.querySelector('footer, [role="contentinfo"]');
    if (footer) {
      const links = footer.querySelectorAll('a');
      nav.footerLinks = Array.from(links).slice(0, 30).map(a => ({
        text: readLinkLabel(a),
        href: a.href
      })).filter(l => l.text.length > 0 && l.text.length < 50);
    }

    // Social links (deduplicated from footer or anywhere)
    const socialPatterns = {
      facebook: /facebook\.com|fb\.com/i,
      twitter: /twitter\.com|x\.com/i,
      instagram: /instagram\.com/i,
      youtube: /youtube\.com/i,
      linkedin: /linkedin\.com/i,
    };
    document.querySelectorAll('a[href]').forEach(a => {
      for (const [name, regex] of Object.entries(socialPatterns)) {
        if (regex.test(a.href) && !nav.socialLinks.find(s => s.name === name)) {
          nav.socialLinks.push({ name, url: a.href });
        }
      }
    });

    return nav;
  });
}

/**
 * Extract real article cards (related / popular / latest / sidebar lists) so the
 * feed prototype can render the publisher's actual content instead of a hardcoded
 * sponsor pool. Looks at multiple common patterns and de-duplicates by href.
 *
 * @param {import('puppeteer-core').Page} page
 * @param {string} sourceUrl  The article URL (used to resolve relative hrefs and
 *                            to drop the article we crawled for the hero)
 * @returns {Promise<Array<{headline:string, href:string, thumbnail:string|null, category:string|null, source:'extracted'}>>}
 */
async function extractRelatedArticles(page, sourceUrl) {
  return page.evaluate((sourceUrl) => {
    const results = [];
    const seen = new Set();

    // Containers that typically hold article links on a publisher article page
    // or homepage. We pull anchors with substantial visible text + (ideally) an
    // image, then filter to URLs that look like articles.
    const containerSelectors = [
      '[class*="related"]', '[class*="Related"]',
      '[class*="recommend"]', '[class*="Recommend"]',
      '[class*="more-from"]', '[class*="more_from"]',
      '[class*="popular"]', '[class*="Popular"]',
      '[class*="trending"]', '[class*="Trending"]',
      '[class*="latest"]', '[class*="Latest"]',
      '[class*="read-next"]', '[class*="ReadNext"]', '[class*="up-next"]',
      'aside', '[role="complementary"]',
      '[class*="story-list"]', '[class*="story-card"]', '[class*="StoryCard"]',
      '[class*="article-list"]', '[class*="articleList"]',
      '[class*="card-grid"]', '[class*="card-list"]',
      'main',
    ];

    const looksLikeArticleHref = (href) => {
      try {
        const u = new URL(href, window.location.origin);
        if (u.origin !== window.location.origin) return false;
        if (/\.(jpg|png|gif|svg|webp|mp4|pdf)(\?|$)/i.test(u.pathname)) return false;
        if (/^\/(tag|category|author|search|login|subscribe|account)\b/i.test(u.pathname)) return false;
        // typical article paths have multiple segments or a numeric/slug-looking tail
        const segments = u.pathname.split('/').filter(Boolean);
        return segments.length >= 2 || /[a-z0-9-]{8,}/i.test(u.pathname);
      } catch { return false; }
    };

    const sourcePath = (() => { try { return new URL(sourceUrl).pathname; } catch { return ''; } })();

    const harvest = (root) => {
      const anchors = root.querySelectorAll('a[href]');
      for (const a of anchors) {
        const href = a.href;
        if (seen.has(href)) continue;
        if (!looksLikeArticleHref(href)) continue;
        try { if (new URL(href).pathname === sourcePath) continue; } catch {}

        // Headline = the largest piece of visible text in the anchor (or its descendants)
        const candidates = [a.getAttribute('aria-label'), a.getAttribute('title'),
          ...Array.from(a.querySelectorAll('h1,h2,h3,h4,[class*="headline"],[class*="title"]')).map(n => n.textContent),
          a.textContent].filter(Boolean).map(s => s.trim());
        const headline = candidates.find(t => t.length >= 18 && t.length <= 200);
        if (!headline) continue;

        // Thumbnail: nearest img in the anchor or its enclosing card
        const card = a.closest('article, li, [class*="card"], [class*="Card"], [class*="item"], div') || a;
        const img = card.querySelector('img');
        let thumbnail = null;
        if (img) {
          thumbnail = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
          if (thumbnail && thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
        }

        // Category / kicker: look for a tag/eyebrow inside the same card
        const kicker = card.querySelector('[class*="kicker"], [class*="eyebrow"], [class*="category"], [class*="Category"], [class*="topic"]');
        const category = kicker ? kicker.textContent.trim().slice(0, 30) : null;

        seen.add(href);
        results.push({ headline, href, thumbnail, category, source: 'extracted' });
      }
    };

    for (const sel of containerSelectors) {
      document.querySelectorAll(sel).forEach(harvest);
      if (results.length >= 24) break;
    }

    return results.slice(0, 24);
  }, sourceUrl);
}

module.exports = { extractBrandKit, extractContent, extractNavigation, extractRelatedArticles };
