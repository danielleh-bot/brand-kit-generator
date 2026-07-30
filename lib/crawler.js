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
        if (el.tagName.toUpperCase() === 'SVG' && el.outerHTML.length < 4000) score += 5; // inline SVG is usually a brand mark
        if (el.tagName === 'IMG' && /\blogo\b/i.test(el.getAttribute('src') || '')) score += 20;
        if (score > bestScore) { bestScore = score; best = el; }
      }
      if (best) {
        // SVG elements live in the SVG namespace: tagName is lowercase 'svg',
        // unlike HTML elements which uppercase. Compare case-insensitively or
        // every inline-SVG logo silently falls into the <img> branch.
        if (best.tagName.toUpperCase() === 'SVG') {
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
    // v2.2: 5-bucket source enum (extracted | derived | fallback | enriched |
    // refined) — enriched/refined are tallied here so a re-run over an enriched
    // kit reports honestly; the crawler itself only ever emits the first three.
    // Deferred to a function so it runs AFTER the deep extractors below mutate
    // the kit — the IIFE used to fire before buttons/header even had sources.
    function computeExtractionQuality() {
      const tally = { extracted: 0, derived: 0, fallback: 0, enriched: 0, refined: 0, fallbackTokens: [] };
      const visit = (path, value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) { value.forEach((v, i) => visit(`${path}[${i}]`, v)); return; }
        if (typeof value.source === 'string') {
          if (value.source === 'fallback') {
            tally.fallback++;
            tally.fallbackTokens.push(path);
          } else if (tally[value.source] !== undefined) {
            tally[value.source]++;
          }
        }
        for (const k of Object.keys(value)) {
          if (k === 'usage' || k === 'matched_selector' || k === 'attempted_selector') continue;
          visit(path ? `${path}.${k}` : k, value[k]);
        }
      };
      visit('colors', colors);
      visit('fonts', fonts);
      // Real tokens, not fabrications — extracted-equivalent for the ratio.
      const real = tally.extracted + tally.derived + tally.enriched + tally.refined;
      const total = real + tally.fallback;
      const ratio = total === 0 ? 0 : tally.extracted / Math.max(1, tally.extracted + tally.fallback);
      return {
        extracted_token_count: tally.extracted,
        derived_token_count: tally.derived,
        enriched_token_count: tally.enriched,
        refined_token_count: tally.refined,
        fallback_token_count: tally.fallback,
        total_tokens: tally.extracted + tally.fallback,
        total_tokens_all_sources: total,
        extraction_ratio: Number(ratio.toFixed(2)),
        fallback_tokens: tally.fallbackTokens,
      };
    }

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
    }

    // ============================================================
    //  DEEP EXTRACTION (v2.2) — Layer 1 quick wins
    //  Everything below is ADDITIVE: new key paths only, nothing
    //  renamed or removed. Each capture is wrapped so a failure in
    //  one extractor never aborts the crawl.
    // ============================================================
    function safely(label, fn, fallbackValue) {
      try { return fn(); } catch (e) { return fallbackValue !== undefined ? fallbackValue : null; }
    }

    // ---- CSS custom properties on :root / html / body ----
    function scanCssCustomProperties() {
      const props = [];
      const seen = new Set();
      const rootCS = window.getComputedStyle(document.documentElement);
      // Chromium enumerates custom properties on the computed style.
      for (let i = 0; i < rootCS.length; i++) {
        const name = rootCS[i];
        if (name && name.startsWith('--') && !seen.has(name)) {
          seen.add(name);
          const value = rootCS.getPropertyValue(name).trim();
          if (value) props.push({ name, value });
        }
      }
      // Stylesheet walk as a safety net — also catches props declared in
      // rules the computed-style enumeration misses. CORS-blocked sheets
      // throw on .cssRules; skip them.
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        if (!rules) continue;
        for (const rule of rules) {
          if (!rule.selectorText || !/(:root|^html\b|^body\b)/.test(rule.selectorText)) continue;
          const style = rule.style;
          if (!style) continue;
          for (let i = 0; i < style.length; i++) {
            const name = style[i];
            if (name.startsWith('--') && !seen.has(name)) {
              seen.add(name);
              const value = style.getPropertyValue(name).trim();
              if (value) props.push({ name, value });
            }
          }
        }
      }

      const roleHints = [
        [/color|clr|brand|accent|primary|secondary|magenta|blue|red|green/i, 'color'],
        [/space|spacing|gap|pad(ding)?|margin/i, 'spacing'],
        [/radius|round/i, 'radius'],
        [/font|type|text-size|fs-|leading|tracking/i, 'typography'],
        [/shadow|elevation/i, 'shadow'],
        [/z-?index|layer/i, 'z-index'],
        [/duration|transition|ease|timing|speed|delay/i, 'motion'],
        [/width|height|size|breakpoint/i, 'sizing'],
      ];
      return props.slice(0, 200).map(({ name, value }) => {
        let role_guess = 'other';
        for (const [re, role] of roleHints) { if (re.test(name)) { role_guess = role; break; } }
        const parsed = parseColor(value);
        const entry = { name, value, role_guess, source: 'extracted' };
        if (parsed) entry.matches_hex = parsed.hex;
        return entry;
      });
    }

    const cssCustomProps = safely('css-vars', scanCssCustomProperties, []);
    if (cssCustomProps.length > 0) colors.css_custom_properties = cssCustomProps;

    // Free color names from CSS custom properties: when a --brand-* prop's
    // value matches an extracted color's hex, derive a human name from the
    // prop name — no LLM call needed for these.
    safely('css-var-naming', () => {
      const PLACEHOLDER_NAMES = ['Primary Accent', 'Secondary Accent', 'Theme Color', 'Primary Text', 'Secondary Text', 'Tertiary Text', 'White', 'Section', 'Secondary', 'Dark Background'];
      const humanize = (name) => name.replace(/^--/, '')
        .replace(/(color|colour|clr|brand|theme|global|sys|ref)[-_]?/gi, '')
        .replace(/[-_]+/g, ' ').trim()
        .split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
      const targets = [colors.primary, colors.secondary, colors.text.primary, colors.text.secondary, colors.backgrounds.dark].filter(Boolean);
      for (const target of targets) {
        if (!PLACEHOLDER_NAMES.includes(target.name)) continue;
        const match = cssCustomProps.find(p => p.matches_hex === target.hex && p.role_guess === 'color');
        if (match) {
          const nm = humanize(match.name);
          if (nm && nm.length > 2 && nm.length < 40) {
            target.name = nm;
            target.named_via = 'css_custom_property';
          }
        }
      }
    });

    // ---- Primary-color promotion from explicit brand CSS variables ----
    // The usage-frequency heuristic above can crown a high-traffic UI accent
    // (e.g. an info/link teal) as "primary" even when the publisher declares
    // its real brand colour in a variable like --primary-color or
    // --navbar-logo-color. When such a variable exists and resolves to a
    // non-grey colour, it's a far stronger brand signal than raw count, so
    // promote it. The displaced usage-pick is preserved as the secondary
    // accent if that slot is empty.
    safely('primary-from-css-var', () => {
      // Highest-confidence names first. Each entry is matched as the WHOLE
      // custom-property name (minus the leading --).
      const PRIMARY_PATTERNS = [
        /^(brand[-_])?primary([-_]colou?r)?$/i,
        /^colou?r[-_]primary$/i,
        /^brand([-_]colou?r)?$/i,
        /^navbar[-_]logo[-_]colou?r$/i,
        /^logo[-_]colou?r$/i,
      ];
      const humanize = (name) => name.replace(/^--/, '')
        .replace(/(colou?r|clr)[-_]?/gi, '')
        .replace(/[-_]+/g, ' ').trim()
        .split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
      let picked = null;
      for (const re of PRIMARY_PATTERNS) {
        picked = cssCustomProps.find(p => p.matches_hex && re.test(p.name.replace(/^--/, '')));
        if (picked) break;
      }
      if (!picked) return;
      const c = parseColor(picked.value);
      // Only override for a real, non-grey, mid-range brand colour — never
      // promote white/black/grey scaffolding to "primary".
      if (!c || isGray(c) || luminance(c) < 16 || luminance(c) > 244) return;
      if (colors.primary && colors.primary.hex === c.hex) return; // already correct

      const displaced = colors.primary;
      const nm = humanize(picked.name);
      colors.primary = {
        name: (nm && nm.length > 1 && nm.length < 40) ? nm : 'Brand Primary',
        hex: c.hex, rgb: c.rgb,
        usage: (displaced && displaced.usage) || [],
        source: 'extracted',
        named_via: 'css_custom_property',
        promoted_from: picked.name,
      };
      // Keep the previous usage-frequency pick around as secondary if free.
      if (displaced && displaced.hex && displaced.hex !== c.hex && !colors.secondary) {
        colors.secondary = { ...displaced, name: displaced.name || 'Secondary Accent' };
      }
      // Refresh derived variants so hover/active shades track the new primary.
      if (colors.primary_variants) {
        colors.primary_variants.darken_5 = { hex: darkenHex(c.hex, 5), name: 'Darker primary', usage: 'Hover states', source: 'derived' };
        colors.primary_variants.darken_10 = { hex: darkenHex(c.hex, 12), name: 'Deepest primary', usage: 'Active/pressed states', source: 'derived' };
      }
    });

    // ---- Shadow registry (natural / deep / sharp) ----
    const shadows = safely('shadows', () => {
      const samples = [];
      const els = document.querySelectorAll('.card, [class*="card"], [class*="Card"], button, [class*="dropdown"], [class*="Dropdown"], [class*="popup"], [class*="modal"], [class*="tooltip"], [class*="menu"], [class*="teaser"], header');
      for (let i = 0; i < Math.min(els.length, 80); i++) {
        const bs = getCS(els[i], 'box-shadow');
        if (bs && bs !== 'none' && !samples.includes(bs)) samples.push(bs);
        if (samples.length >= 8) break;
      }
      if (samples.length === 0) return null;
      const parsed = samples.map(s => {
        const nums = s.match(/-?\d+(?:\.\d+)?px/g) || [];
        const blur = nums.length >= 3 ? parseFloat(nums[2]) : 0;
        return { value: s, blur };
      }).sort((a, b) => a.blur - b.blur);
      const registry = { source: 'extracted' };
      if (parsed.length === 1) {
        registry.natural = parsed[0].value;
      } else {
        registry.sharp = parsed[0].value;
        registry.natural = parsed[Math.floor(parsed.length / 2)].value;
        registry.deep = parsed[parsed.length - 1].value;
      }
      return registry;
    });

    // ---- Border-radius map by role ----
    const border_radius = safely('radius-map', () => {
      const roleSel = {
        buttons: 'button, .btn, [role="button"], a[class*="btn"], [class*="cta"]',
        cards: '.card, [class*="card"], [class*="teaser"]',
        images: 'article img, .card img, [class*="thumbnail"] img, [class*="teaser"] img',
        overlays: '[class*="modal"], [class*="overlay"], [class*="popup"], [class*="dialog"]',
        pills: '[class*="pill"], [class*="chip"], [class*="tag"], [class*="badge"]',
      };
      const map = {};
      for (const [role, sel] of Object.entries(roleSel)) {
        const counts = {};
        const els = document.querySelectorAll(sel);
        for (let i = 0; i < Math.min(els.length, 20); i++) {
          const br = getCS(els[i], 'border-radius');
          if (!br) continue;
          counts[br] = (counts[br] || 0) + 1;
        }
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (top) map[role] = top[0];
      }
      if (Object.keys(map).length === 0) return null;
      map.source = 'extracted';
      return map;
    });

    // ---- Spacing scale from --spacing-* / --space-* / --gap-* props ----
    safely('spacing-scale', () => {
      const spacingProps = cssCustomProps.filter(p =>
        /^--(spacing|space|gap)[-_]/i.test(p.name) && /^\d+(\.\d+)?(px|rem|em)$/.test(p.value));
      if (spacingProps.length === 0) return;
      const toPx = v => /rem|em$/.test(v) ? parseFloat(v) * 16 : parseFloat(v);
      const sorted = [...new Set(spacingProps.map(p => p.value))].sort((a, b) => toPx(a) - toPx(b));
      const tiers = ['base', 'small', 'medium', 'large', 'xl', 'xxl'];
      const scale = { source: 'extracted' };
      sorted.slice(0, 6).forEach((v, i) => { scale[tiers[i]] = v; });
      layout_patterns.spacing_scale = scale;
    });

    // ---- Max-width map (600–1800px) ----
    safely('max-widths', () => {
      const out = {};
      const els = document.querySelectorAll('main, [class*="container"], [class*="wrapper"], [class*="content"], article, section');
      for (let i = 0; i < Math.min(els.length, 60); i++) {
        const mw = getCS(els[i], 'max-width');
        const v = parseInt(mw);
        if (!mw || mw === 'none' || !v || v < 600 || v > 1800) continue;
        if (!out.site_container && v >= 1100) out.site_container = mw;
        else if (!out.card_wide && v >= 800 && v < 1100) out.card_wide = mw;
        else if (!out.card_narrow && v < 800) out.card_narrow = mw;
        if (out.site_container && out.card_wide && out.card_narrow) break;
      }
      if (Object.keys(out).length > 0) {
        out.source = 'extracted';
        layout_patterns.max_widths = out;
      }
    });

    // ---- 16-role extended type hierarchy (legacy type_scale untouched) ----
    safely('type-scale-extended', () => {
      const roles = {
        hero_headline: 'h1',
        secondary_headline: 'h2',
        tertiary_headline: 'h3',
        right_rail_headline: 'aside h3, aside h4, [class*="sidebar"] h3, [role="complementary"] h3',
        sub_nav: '[class*="subnav"] a, [class*="sub-nav"] a, [class*="secondary-nav"] a, nav nav a',
        byline: '[class*="byline"], [rel="author"], [class*="author-name"], [class*="author"] a',
        timestamp: 'time, [datetime], [class*="timestamp"]',
        more_link: 'a[class*="more"], [class*="see-all"] a, [class*="view-all"] a, a[class*="ReadMore"]',
        footer_link: 'footer a',
        caption: 'figcaption, .caption, [class*="caption"]',
        kicker: '[class*="kicker"], [class*="eyebrow"], [class*="overline"]',
        deck: '[class*="deck"], [class*="standfirst"], [class*="subtitle"], h1 + p',
        card_title: '.card h3, [class*="card"] h3, [class*="teaser"] h3, [class*="Card"] h3',
        list_headline: 'li h3, [class*="list"] h3, [class*="item"] h3',
        tag_label: '[class*="tag"], [class*="pill"], [class*="chip"]',
        button_label: 'button, .btn, [role="button"]',
      };
      const extended = [];
      for (const [role, sel] of Object.entries(roles)) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const cs = window.getComputedStyle(el);
        const entry = {
          role,
          size: cs.fontSize,
          weight: parseInt(cs.fontWeight) || 400,
          family: cleanFont(cs.fontFamily.split(',')[0]),
          source: 'extracted',
          matched_selector: sel,
        };
        if (cs.lineHeight !== 'normal') entry.line_height = cs.lineHeight;
        if (cs.textTransform !== 'none') entry.text_transform = cs.textTransform;
        if (cs.letterSpacing !== 'normal' && cs.letterSpacing !== '0px') entry.letter_spacing = cs.letterSpacing;
        const c = parseColor(cs.color);
        if (c) entry.color = c.hex;
        if (cs.fontStyle !== 'normal') entry.style = cs.fontStyle;
        extended.push(entry);
      }
      if (extended.length > 0) fonts.type_scale_extended = extended;
    });

    // ---- Text-color depth (adds 3 levels to the existing 3) ----
    safely('text-depth', () => {
      const depthRoles = [
        ['deep_dark', 'h1', 'Hero headlines'],
        ['body', 'article p, main p, p', 'Body copy'],
        ['caption', 'figcaption, .caption, [class*="caption"]', 'Captions'],
      ];
      for (const [role, sel, usage] of depthRoles) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const c = parseColor(getCS(el, 'color'));
        if (!c) continue;
        colors.text[role] = {
          name: role.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
          hex: c.hex, rgb: c.rgb, usage: [usage], source: 'extracted',
        };
      }
    });

    // ---- Translucent UI overlay colors (rgba alpha < 1) ----
    safely('overlays', () => {
      const out = {};
      const roleSel = {
        video_scrim: '[class*="video"] [class*="overlay"], [class*="scrim"], [class*="gradient-overlay"], [class*="Overlay"]',
        modal: '[class*="modal"], [class*="dialog"], [class*="lightbox"], [class*="backdrop"]',
        sponsored: '[class*="sponsor"], [class*="advert"], [class*="paid"]',
      };
      for (const [role, sel] of Object.entries(roleSel)) {
        const els = document.querySelectorAll(sel);
        for (let i = 0; i < Math.min(els.length, 10); i++) {
          const raw = getCS(els[i], 'background-color');
          const alphaMatch = raw && raw.match(/rgba\([^)]*,\s*(0?\.\d+)\s*\)/);
          if (alphaMatch && parseFloat(alphaMatch[1]) < 1) {
            out[role] = { value: raw, source: 'extracted' };
            break;
          }
        }
      }
      if (Object.keys(out).length > 0) colors.ui_overlays = out;
    });

    // ---- Border / divider colors ----
    safely('borders', () => {
      const out = {};
      const dividerEl = document.querySelector('[class*="divider"], [class*="separator"], [role="separator"]');
      if (dividerEl) {
        const c = parseColor(getCS(dividerEl, 'border-top-color')) || parseColor(getCS(dividerEl, 'background-color'));
        if (c) out.divider = { hex: c.hex, source: 'extracted' };
      }
      const hrEl = document.querySelector('hr');
      if (hrEl) {
        const c = parseColor(getCS(hrEl, 'border-top-color')) || parseColor(getCS(hrEl, 'background-color'));
        if (c) out.hr = { hex: c.hex, source: 'extracted' };
      }
      if (Object.keys(out).length > 0) colors.borders = out;
    });

    // ---- Show / section brand colors (CBS Mornings orange etc.) ----
    safely('show-sections', () => {
      const pageBgHex = colors.backgrounds.base && colors.backgrounds.base.hex;
      const out = {};
      const sections = document.querySelectorAll('section, [class*="show-"], section[data-show], [data-section]');
      let captured = 0;
      for (const sec of sections) {
        if (captured >= 12) break;
        if (!sec.offsetHeight || sec.offsetHeight < 80) continue;
        // Band colour is often set on a scoped wrapper, not the section itself.
        let bg = parseColor(window.getComputedStyle(sec).backgroundColor);
        if (!bg && sec.parentElement) {
          const wrapper = sec.parentElement.closest('[class]');
          if (wrapper) bg = parseColor(window.getComputedStyle(wrapper).backgroundColor);
        }
        if (!bg || isGray(bg) || bg.hex === pageBgHex) continue;
        const heading = sec.querySelector('h1, h2, h3, [class*="title"]');
        const clsMatch = String(sec.className || '').match(/show-([\w-]+)/);
        const label = (heading && heading.textContent.trim().slice(0, 40))
          || sec.getAttribute('data-show') || (clsMatch && clsMatch[1]) || '';
        if (!label) continue;
        const slugKey = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
        if (!slugKey || out[slugKey]) continue;
        out[slugKey] = { hex: bg.hex, section_label: label, source: 'extracted' };
        captured++;
      }
      if (captured > 0) colors.show_brand_colors = out;
    });

    // ---- Icon catalog (viewBox + aria, no semantic naming — Layer 2's job) ----
    safely('icon-catalog', () => {
      const catalog = [];
      const svgs = document.querySelectorAll('svg');
      for (let i = 0; i < Math.min(svgs.length, 60); i++) {
        const svg = svgs[i];
        const rect = svg.getBoundingClientRect();
        if (rect.width > 80 || rect.height > 80) continue; // logo-sized, not an icon
        if (rect.width === 0 && rect.height === 0) continue;
        const titleEl = svg.querySelector('title');
        const btn = svg.closest('button, a, [role="button"]');
        catalog.push({
          viewBox: svg.getAttribute('viewBox') || null,
          aria_label: svg.getAttribute('aria-label') || (btn && btn.getAttribute('aria-label')) || null,
          title: titleEl ? titleEl.textContent.trim() : null,
          role_hint: btn ? ((btn.getAttribute('aria-label') || btn.textContent.trim()).slice(0, 30) || null) : null,
          source: 'extracted',
        });
      }
      const seen = new Set();
      const deduped = catalog.filter(c => {
        const k = `${c.viewBox}|${c.aria_label}|${c.title}|${c.role_hint}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).slice(0, 40);
      if (deduped.length > 0) icons.catalog = deduped;
    });

    // ---- Header layers, detailed (per-layer bg/text/height/is_dark) ----
    safely('header-layers', () => {
      if (!headerEl) return;
      const layers = Array.from(headerEl.children)
        .filter(child => child.offsetHeight > 0)
        .slice(0, 5)
        .map(child => {
          const cs = window.getComputedStyle(child);
          const bg = parseColor(cs.backgroundColor);
          return {
            tag: child.tagName.toLowerCase(),
            bg: bg ? bg.hex : null,
            text_color: (parseColor(cs.color) || {}).hex || null,
            height: child.offsetHeight,
            is_dark: bg ? luminance(bg) < 128 : null,
            source: 'extracted',
          };
        });
      if (layers.length > 0) layout_patterns.header.layers_detailed = layers;
    });

    // ---- Button variants beyond primary (secondary / outline / soft_cta) ----
    safely('button-variants', () => {
      const all = document.querySelectorAll('button, a[class*="btn"], a[class*="cta"], [role="button"], input[type="submit"]');
      const seenStyles = new Set();
      for (let i = 0; i < Math.min(all.length, 60); i++) {
        const btn = all[i];
        if (btn.offsetHeight < 24 || btn.offsetWidth < 40) continue;
        const cs = window.getComputedStyle(btn);
        const bg = parseColor(cs.backgroundColor);
        const borderW = parseFloat(cs.borderTopWidth) || 0;
        const borderC = parseColor(cs.borderTopColor);
        const radius = cs.borderRadius;
        const key = `${bg ? bg.hex : 'none'}|${borderW}|${radius}`;
        if (seenStyles.has(key)) continue;
        seenStyles.add(key);
        if (buttons.primary && bg && buttons.primary.background_color === bg.hex) continue;
        const entry = {
          background_color: bg ? bg.hex : null,
          text_color: (parseColor(cs.color) || {}).hex || null,
          border: borderW > 0 && borderC ? `${borderW}px solid ${borderC.hex}` : null,
          border_radius: radius,
          padding: cs.padding,
          font_size: cs.fontSize,
          font_weight: parseInt(cs.fontWeight) || 400,
          source: 'extracted',
        };
        if (!buttons.outline && borderW > 0 && (!bg || luminance(bg) > 240)) buttons.outline = entry;
        else if (!buttons.soft_cta && bg && !isGray(bg) && luminance(bg) > 150) buttons.soft_cta = entry;
        else if (!buttons.secondary && bg && isGray(bg) && luminance(bg) < 240) buttons.secondary = entry;
        if (buttons.outline && buttons.soft_cta && buttons.secondary) break;
      }
    });

    // ---- Chart embed detection (Datawrapper / Flourish / Highcharts / …) ----
    const charts = safely('charts', () => {
      const platforms = {
        datawrapper: 'iframe[src*="datawrapper"]',
        flourish: 'iframe[src*="flourish"], [class*="flourish-embed"]',
        highcharts: 'iframe[src*="highcharts"], [class*="highcharts-container"]',
        nyt_atlas: 'iframe[src*="atlas.nyt.com"]',
        infogram: 'iframe[src*="infogram"]',
      };
      const instances = [];
      let platform = null;
      for (const [name, sel] of Object.entries(platforms)) {
        const els = document.querySelectorAll(sel);
        if (els.length === 0) continue;
        platform = platform || name;
        for (let i = 0; i < Math.min(els.length, 5); i++) {
          instances.push({
            platform: name,
            src: (els[i].src || '').slice(0, 200) || null,
            embed_method: els[i].tagName === 'IFRAME' ? 'iframe' : 'div-embed',
          });
        }
      }
      if (instances.length === 0) return null;
      return { platform, embed_method: instances[0].embed_method, instances, source: 'extracted' };
    });

    // ---- Logo light/dark variants — second-pass scoring inside <footer> ----
    safely('logo-variants', () => {
      const footerEl = document.querySelector('footer, [role="contentinfo"]');
      if (!footerEl) return;
      const footerBg = parseColor(window.getComputedStyle(footerEl).backgroundColor);
      for (const el of footerEl.querySelectorAll('img, svg')) {
        const rect = el.getBoundingClientRect();
        if (rect.height < 16 || rect.width < 40) continue;
        const hint = (el.getAttribute('alt') || '') + ' '
          + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '') + ' '
          + (el.getAttribute('aria-label') || '');
        if (/(facebook|twitter|instagram|youtube|linkedin|tiktok|pinterest|spotify|apple|google|app.?store|play)/i.test(hint)) continue;
        const variant = {
          context: 'footer',
          on_dark: footerBg ? luminance(footerBg) < 128 : null,
          type: el.tagName.toUpperCase() === 'SVG' ? 'svg' : 'image',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          source: 'extracted',
        };
        if (el.tagName === 'IMG') variant.url = el.src || '';
        logos.variants.push(variant);
        break;
      }
    });

    // ---- Logo SVG structural summary (constrains Layer-2 prose) ----
    safely('logo-summary', () => {
      if (!logos.primary || !logos.primary.svg) return;
      const tpl = document.createElement('div');
      tpl.innerHTML = logos.primary.svg;
      const svg = tpl.querySelector('svg');
      if (!svg) return;
      const fills = new Set();
      svg.querySelectorAll('[fill]').forEach(node => {
        const f = node.getAttribute('fill');
        if (f && f !== 'none' && !f.startsWith('url(')) fills.add(f);
      });
      const hasText = svg.querySelectorAll('text').length > 0;
      logos.primary.shape_summary = {
        path_count: svg.querySelectorAll('path').length,
        group_count: svg.querySelectorAll('g').length,
        unique_fills: [...fills].slice(0, 10),
        has_text: hasText,
        viewBox: svg.getAttribute('viewBox') || null,
        kind: hasText ? 'wordmark-or-combined' : 'mark-only',
        source: 'extracted',
      };
    });

    const extractionQuality = computeExtractionQuality();

    const result = { brand, logos, colors, fonts, brand_voice, photo_style, graphics, icons, layout_patterns, spacing, buttons, extraction_quality: extractionQuality };
    if (shadows) result.shadows = shadows;
    if (border_radius) result.border_radius = border_radius;
    if (charts) result.charts = charts;
    return result;
  });

  // Add metadata
  extracted.metadata = {
    analysis_date: new Date().toISOString().split('T')[0],
    source_url: url,
    crawler_version: '2.2.0',
    analysis_method: 'Puppeteer computed-style extraction (deep)',
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

// ============================================================
//  v2.2 TOP-LEVEL EXTRACTORS — the only three functions allowed
//  to drive Puppeteer round-trips outside the single-evaluate
//  pattern: responsive breakpoints (viewport probe), behavior
//  observers (pre-goto injection), interaction behaviors
//  (hover/focus/active probes). All are skip-safe: failures emit
//  `source: 'partial'` with a reason; they never throw.
// ============================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Infer responsive breakpoints. Tries the stylesheet @media walk first
 * (cheap, exact); falls back to a multi-viewport layout probe when CORS
 * blocks the sheets. Restores the original viewport when done.
 * @param {import('puppeteer-core').Page} page
 * @returns {Promise<object>} breakpoints {mobile?, tablet?, desktop?, source}
 */
async function extractResponsiveBreakpoints(page) {
  const classify = (widths, source) => {
    const bp = { source };
    const mobile = widths.filter((w) => w <= 600).pop();
    const tablet = widths.filter((w) => w > 600 && w <= 1024).pop();
    const desktop = widths.filter((w) => w > 1024 && w <= 1500).pop();
    if (mobile) bp.mobile = mobile + 'px';
    if (tablet) bp.tablet = tablet + 'px';
    if (desktop) bp.desktop = desktop + 'px';
    return bp;
  };

  let fromSheets = [];
  try {
    fromSheets = await page.evaluate(() => {
      const widths = new Set();
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; } // CORS-blocked
        if (!rules) continue;
        for (const rule of rules) {
          if (!rule.media || !rule.media.mediaText) continue;
          const matches = rule.media.mediaText.match(/\((?:max|min)-width:\s*\d+(?:\.\d+)?(?:px|em|rem)\)/g) || [];
          for (const m of matches) {
            const mm = m.match(/(\d+(?:\.\d+)?)(px|em|rem)/);
            if (!mm) continue;
            let px = parseFloat(mm[1]);
            if (mm[2] !== 'px') px *= 16;
            if (px >= 320 && px <= 1920) widths.add(Math.round(px));
          }
        }
      }
      return [...widths].sort((a, b) => a - b);
    });
  } catch { /* fall through to probe */ }

  if (fromSheets.length >= 2) return classify(fromSheets, 'stylesheet');

  // Viewport probe safety net: re-read layout at four widths, infer a
  // breakpoint wherever the grid/display signature changes.
  try {
    const original = page.viewport();
    const layouts = [];
    for (const width of [1440, 1024, 768, 480]) {
      await page.setViewport({ width, height: 900 });
      await sleep(350);
      const snap = await page.evaluate(() => {
        const el = document.querySelector('[class*="grid"], main, [class*="container"], body > div');
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        return { display: cs.display, cols: cs.gridTemplateColumns, flexDir: cs.flexDirection };
      });
      layouts.push({ width, snap });
    }
    if (original) await page.setViewport(original);
    const widths = [];
    for (let i = 1; i < layouts.length; i++) {
      const a = layouts[i - 1].snap, b = layouts[i].snap;
      if (!a || !b) continue;
      if (a.display !== b.display || a.cols !== b.cols || a.flexDir !== b.flexDir) {
        widths.push(layouts[i].width);
      }
    }
    if (widths.length > 0) return classify(widths.sort((x, y) => x - y), 'probed');
    if (fromSheets.length > 0) return classify(fromSheets, 'partial');
    return { source: 'partial', reason: 'no media rules readable; no layout transitions detected' };
  } catch (e) {
    if (fromSheets.length > 0) return classify(fromSheets, 'partial');
    return { source: 'partial', reason: String((e && e.message) || e).slice(0, 120) };
  }
}

/**
 * Install pre-navigation observers that capture JS-driven behavior the
 * computed-style pass can't see: Web Animations API calls (entry
 * animations) and IntersectionObserver registrations (scroll reveal).
 * MUST run before page.goto(). Results are read back after load via
 * window.__capturedAnimations / window.__capturedObservers.
 * @param {import('puppeteer-core').Page} page
 */
async function installBehaviorObservers(page) {
  await page.evaluateOnNewDocument(() => {
    window.__capturedAnimations = [];
    window.__capturedObservers = [];
    const describe = (el) => {
      if (!el || !el.tagName) return null;
      const raw = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '';
      const cls = String(raw).split(/\s+/).filter(Boolean).slice(0, 3).join('.');
      return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
    };
    try {
      const origAnimate = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options) {
        try {
          if (window.__capturedAnimations.length < 50) {
            window.__capturedAnimations.push({
              element_selector: describe(this),
              keyframes: keyframes && typeof keyframes === 'object' ? JSON.parse(JSON.stringify(keyframes)) : null,
              options: typeof options === 'number' ? { duration: options } : (options ? JSON.parse(JSON.stringify(options)) : null),
            });
          }
        } catch { /* never break the page */ }
        return origAnimate.apply(this, arguments);
      };
    } catch { /* page may freeze the prototype */ }
    try {
      const OrigIO = window.IntersectionObserver;
      window.IntersectionObserver = function (callback, options) {
        const inst = new OrigIO(callback, options);
        const origObserve = inst.observe.bind(inst);
        inst.observe = (el) => {
          try {
            if (window.__capturedObservers.length < 80) {
              window.__capturedObservers.push({
                element_selector: describe(el),
                root_margin: (options && options.rootMargin) || '0px',
                threshold: options && options.threshold != null ? options.threshold : 0,
                callback_fingerprint: String(callback).slice(0, 120),
              });
            }
          } catch { /* never break the page */ }
          return origObserve(el);
        };
        return inst;
      };
      window.IntersectionObserver.prototype = OrigIO.prototype;
    } catch { /* ignore */ }
  });
}

// Properties we diff across interaction states. Everything here is
// paint/composite-only — the same safe list the loader builder enforces.
const BEHAVIOR_DIFF_PROPS = [
  'color', 'background-color', 'border-color', 'box-shadow', 'opacity',
  'transform', 'text-decoration-line', 'text-decoration-color', 'filter',
  'outline-width', 'outline-color', 'outline-style',
];

const BEHAVIOR_PROBE_SELECTORS = [
  'a', 'nav a', 'button', '.btn', '[class*="card"]', '[class*="Card"]',
  '[class*="cta"]', '[class*="CTA"]', '[class*="link"]', '[class*="badge"]',
  '[class*="pill"]', '[class*="teaser"]',
];

/**
 * Capture the publisher's interaction language: transitions registry,
 * live hover/focus/active diffs, @keyframes, entry animations, scroll
 * reveal patterns, lazy-load skeletons, tickers, and the derived easing
 * palette + duration tiers. Run AFTER page load, when the page is stable.
 * Every sub-capture is independent — one failing selector never aborts.
 * @param {import('puppeteer-core').Page} page
 * @returns {Promise<object>} behaviors section for the brand kit
 */
async function extractInteractionBehaviors(page) {
  const behaviors = {
    transitions: [], hover_states: [], focus_states: [], active_states: [],
    keyframes: [], entry_animations: [], scroll_reveal: [],
    lazy_load: {}, tickers: [], easings: [], duration_scale: {},
  };

  // ---- Static pass: transitions, keyframes, lazy-load, tickers ----
  let probes = [];
  try {
    const staticPass = await page.evaluate((SELECTORS) => {
      const out = { transitions: [], keyframes: [], lazy_load: {}, tickers: [], probes: [], focusables: [], buttons: [] };
      const toMs = (s) => {
        const v = parseFloat(s);
        if (!Number.isFinite(v)) return 0;
        return Math.round(s.trim().endsWith('ms') ? v : v * 1000);
      };
      const seenT = new Set();
      for (const sel of SELECTORS) {
        let el;
        try { el = document.querySelector(sel); } catch { continue; }
        if (!el) continue;
        const cs = window.getComputedStyle(el);
        if (cs.transitionDuration && cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0)) {
          const props = cs.transitionProperty.split(',').map((s) => s.trim());
          const durs = cs.transitionDuration.split(',').map((s) => s.trim());
          const eases = cs.transitionTimingFunction.split(/,(?![^()]*\))/).map((s) => s.trim());
          const delays = cs.transitionDelay.split(',').map((s) => s.trim());
          props.forEach((p, i) => {
            const key = sel + '|' + p;
            if (seenT.has(key)) return;
            seenT.add(key);
            out.transitions.push({
              selector_class: sel,
              property: p,
              duration_ms: toMs(durs[i % durs.length]),
              easing: eases[i % eases.length],
              delay_ms: toMs(delays[i % delays.length]),
            });
          });
        }
        const rect = el.getBoundingClientRect();
        const visible = rect.width > 4 && rect.height > 4 && rect.top >= 0 && rect.top < window.innerHeight;
        if (visible) {
          out.probes.push(sel);
          if (/^(a|button)/.test(el.tagName.toLowerCase()) || el.matches('a, button, [tabindex]')) out.focusables.push(sel);
          if (el.matches('button, .btn, [role="button"]')) out.buttons.push(sel);
        }
      }

      // @keyframes walk (CORS-tolerant) + used-by cross-reference
      const keyframeRules = {};
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.type === CSSRule.KEYFRAMES_RULE && !keyframeRules[rule.name]) {
            const steps = [];
            for (const kf of rule.cssRules) {
              const properties = {};
              for (let i = 0; i < kf.style.length; i++) {
                const prop = kf.style[i];
                properties[prop] = kf.style.getPropertyValue(prop);
              }
              steps.push({ percent: kf.keyText, properties });
            }
            keyframeRules[rule.name] = { name: rule.name, steps: steps.slice(0, 10), used_by_selectors: [] };
          }
        }
      }
      // Which keyframes are actually used? Sample animation-prone elements.
      const animSel = SELECTORS.concat(['[class*="live"]', '[class*="LIVE"]', '[class*="ticker"]', '[class*="skeleton"]', '[class*="shimmer"]', '[class*="pulse"]', '[class*="loading"]', '[class*="marquee"]']).join(', ');
      let animEls = [];
      try { animEls = Array.from(document.querySelectorAll(animSel)).slice(0, 120); } catch { animEls = []; }
      for (const el of animEls) {
        const cs = window.getComputedStyle(el);
        const names = cs.animationName.split(',').map((s) => s.trim()).filter((n) => n && n !== 'none');
        if (names.length === 0) continue;
        const raw = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '';
        const desc = el.tagName.toLowerCase() + (String(raw).split(/\s+/).filter(Boolean).slice(0, 2).join('.') ? '.' + String(raw).split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '');
        const durs = cs.animationDuration.split(',').map((s) => s.trim());
        names.forEach((n, i) => {
          if (keyframeRules[n] && !keyframeRules[n].used_by_selectors.includes(desc)) {
            keyframeRules[n].used_by_selectors.push(desc);
          }
          if (/marquee|ticker|scroll[-_]?(left|right)/i.test(n)) {
            out.tickers.push({ selector: desc, keyframe_name: n, duration_ms: toMs(durs[i % durs.length]), direction: cs.animationDirection });
          }
        });
      }
      out.keyframes = Object.values(keyframeRules).slice(0, 20);

      // Lazy load + skeletons
      out.lazy_load.count = document.querySelectorAll('img[loading="lazy"]').length;
      const skeleton = document.querySelector('[class*="skeleton"], [class*="shimmer"], [class*="placeholder"]');
      out.lazy_load.skeleton_present = !!skeleton;
      if (skeleton) {
        const an = window.getComputedStyle(skeleton).animationName;
        if (an && an !== 'none') out.lazy_load.shimmer_keyframe_name = an.split(',')[0].trim();
      }
      return out;
    }, BEHAVIOR_PROBE_SELECTORS);

    behaviors.transitions = staticPass.transitions;
    behaviors.keyframes = staticPass.keyframes;
    behaviors.lazy_load = staticPass.lazy_load;
    behaviors.tickers = staticPass.tickers;
    probes = { hover: staticPass.probes.slice(0, 12), focus: staticPass.focusables.slice(0, 6), active: staticPass.buttons.slice(0, 2) };
  } catch (e) {
    behaviors.transitions = [{ source: 'partial', reason: String((e && e.message) || e).slice(0, 120) }];
    probes = { hover: [], focus: [], active: [] };
  }

  // ---- Interaction probes: hover / focus / active ----
  const snapshot = (sel) => page.$eval(sel, (el, PROPS) => {
    const cs = window.getComputedStyle(el);
    const o = {};
    PROPS.forEach((p) => { o[p] = cs.getPropertyValue(p); });
    o.__transitionMs = Math.max(0, ...cs.transitionDuration.split(',').map((s) => {
      const v = parseFloat(s);
      return Number.isFinite(v) ? (s.trim().endsWith('ms') ? v : v * 1000) : 0;
    }));
    return o;
  }, BEHAVIOR_DIFF_PROPS);

  const diffStates = (before, after) => {
    const diff = {};
    for (const p of BEHAVIOR_DIFF_PROPS) {
      if (before[p] !== after[p]) diff[p.replace(/-/g, '_')] = { from: before[p], to: after[p] };
    }
    return diff;
  };

  for (const sel of probes.hover) {
    try {
      const before = await snapshot(sel);
      await page.hover(sel);
      await sleep(Math.min(600, (before.__transitionMs || 0) + 80));
      const after = await snapshot(sel);
      const diff = diffStates(before, after);
      if (Object.keys(diff).length > 0) {
        behaviors.hover_states.push({ selector_class: sel, diff, transition_duration_ms: Math.round(before.__transitionMs || 0) });
      }
      await page.mouse.move(2, 2);
      await sleep(120);
    } catch (e) {
      behaviors.hover_states.push({ selector_class: sel, source: 'partial', reason: String((e && e.message) || e).slice(0, 80) });
    }
  }

  for (const sel of probes.focus) {
    try {
      const before = await snapshot(sel);
      await page.focus(sel);
      await sleep(Math.min(400, (before.__transitionMs || 0) + 80));
      const after = await snapshot(sel);
      const diff = diffStates(before, after);
      if (Object.keys(diff).length > 0) {
        behaviors.focus_states.push({ selector_class: sel, diff, transition_duration_ms: Math.round(before.__transitionMs || 0) });
      }
      await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    } catch (e) {
      behaviors.focus_states.push({ selector_class: sel, source: 'partial', reason: String((e && e.message) || e).slice(0, 80) });
    }
  }

  for (const sel of probes.active) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      const box = await el.boundingBox();
      if (!box) continue;
      const before = await snapshot(sel);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await sleep(120);
      const after = await snapshot(sel);
      await page.mouse.up();
      const diff = diffStates(before, after);
      if (Object.keys(diff).length > 0) {
        behaviors.active_states.push({ selector_class: sel, diff });
      }
      await page.mouse.move(2, 2);
    } catch (e) {
      try { await page.mouse.up(); } catch { /* already up */ }
      behaviors.active_states.push({ selector_class: sel, source: 'partial', reason: String((e && e.message) || e).slice(0, 80) });
    }
  }

  // ---- Entry animations + scroll reveal (from the pre-goto observers) ----
  try {
    const captured = await page.evaluate(() => ({
      animations: window.__capturedAnimations || [],
      observers: window.__capturedObservers || [],
    }));
    behaviors.entry_animations = captured.animations.slice(0, 20).map((a) => ({
      element_selector: a.element_selector,
      keyframes: a.keyframes,
      duration_ms: a.options ? (a.options.duration || null) : null,
      easing: a.options ? (a.options.easing || null) : null,
      delay_ms: a.options ? (a.options.delay || 0) : 0,
      js_driven: true,
    }));

    // Scroll the page in steps and watch for class additions — the classic
    // "card enters viewport → reveal class" pattern.
    await page.evaluate(() => {
      window.__classMutations = [];
      const describe = (el) => {
        const raw = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '';
        return el.tagName.toLowerCase() + '.' + String(raw).split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      };
      const mo = new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
          if (window.__classMutations.length >= 100) return;
          const raw = m.target.className && m.target.className.baseVal !== undefined ? m.target.className.baseVal : m.target.className || '';
          window.__classMutations.push({ selector: describe(m.target), old_classes: m.oldValue || '', new_classes: String(raw) });
        }
      });
      mo.observe(document.body, { attributes: true, attributeOldValue: true, attributeFilter: ['class'], subtree: true });
    });
    for (let i = 1; i <= 5; i++) {
      await page.evaluate((step) => window.scrollTo({ top: (document.body.scrollHeight * step) / 6 }), i);
      await sleep(300);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(200);

    const mutations = await page.evaluate(() => window.__classMutations || []);
    const observerMap = new Map(captured.observers.map((o) => [o.element_selector, o]));
    const seenReveal = new Set();
    for (const m of mutations) {
      const oldSet = new Set(m.old_classes.split(/\s+/).filter(Boolean));
      const added = m.new_classes.split(/\s+/).filter((c) => c && !oldSet.has(c));
      const revealClasses = added.filter((c) => /visible|reveal|in-?view|animate|active|shown|loaded|enter/i.test(c));
      if (revealClasses.length === 0 || seenReveal.has(m.selector)) continue;
      seenReveal.add(m.selector);
      const obs = observerMap.get(m.selector);
      behaviors.scroll_reveal.push({
        selector_class: m.selector,
        trigger: 'viewport',
        threshold: obs ? obs.threshold : null,
        root_margin: obs ? obs.root_margin : null,
        mutation: 'add-class',
        payload: revealClasses.join(' '),
      });
      if (behaviors.scroll_reveal.length >= 10) break;
    }
    // Surface observer registrations even when no mutation was caught — the
    // intent signal alone matters for the gap report.
    if (behaviors.scroll_reveal.length === 0 && captured.observers.length > 0) {
      const byMargin = captured.observers.slice(0, 5).map((o) => ({
        selector_class: o.element_selector,
        trigger: 'viewport',
        threshold: o.threshold,
        root_margin: o.root_margin,
        mutation: 'unknown',
        payload: null,
      }));
      behaviors.scroll_reveal = byMargin;
    }
  } catch (e) {
    behaviors.scroll_reveal = [{ source: 'partial', reason: String((e && e.message) || e).slice(0, 120) }];
  }

  // ---- Derived: easing palette + duration tiers ----
  try {
    const easingCounts = {};
    const durations = [];
    for (const t of behaviors.transitions) {
      if (t.easing) easingCounts[t.easing] = (easingCounts[t.easing] || 0) + 1;
      if (t.duration_ms > 0) durations.push(t.duration_ms);
    }
    for (const a of behaviors.entry_animations) {
      if (a.easing) easingCounts[a.easing] = (easingCounts[a.easing] || 0) + 1;
      if (a.duration_ms > 0) durations.push(a.duration_ms);
    }
    behaviors.easings = Object.entries(easingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([value, count]) => ({ value, count }));
    const tierOf = (d) => (d <= 150 ? 'fast' : d <= 280 ? 'normal' : d <= 450 ? 'slow' : 'hero');
    const tiers = { fast: [], normal: [], slow: [], hero: [] };
    durations.forEach((d) => tiers[tierOf(d)].push(d));
    for (const [tier, vals] of Object.entries(tiers)) {
      if (vals.length === 0) continue;
      vals.sort((a, b) => a - b);
      behaviors.duration_scale[tier] = vals[Math.floor(vals.length / 2)];
    }
  } catch { /* derived sections are best-effort */ }

  return behaviors;
}

module.exports = {
  extractBrandKit, extractContent, extractNavigation, extractRelatedArticles,
  extractResponsiveBreakpoints, installBehaviorObservers, extractInteractionBehaviors,
};
