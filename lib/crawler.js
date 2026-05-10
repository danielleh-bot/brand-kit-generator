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
    // Find header logo
    const headerEl = document.querySelector('header, [role="banner"], .header, #header');
    if (headerEl) {
      const logoImg = headerEl.querySelector('img[class*="logo"], img[alt*="logo"], img[src*="logo"], a img, svg');
      if (logoImg) {
        if (logoImg.tagName === 'SVG') {
          logos.primary.type = 'svg';
          logos.primary.svg = logoImg.outerHTML.substring(0, 2000);
        } else {
          logos.primary.type = 'image';
          logos.primary.url = logoImg.src || '';
          logos.primary.alt = logoImg.alt || '';
        }
      }
      // Get logo text if it's a text-based logo
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

    return { brand, logos, colors, fonts, brand_voice, photo_style, graphics, icons, layout_patterns, spacing, extraction_quality: extractionQuality };
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

    // Top navigation
    const navEl = document.querySelector('nav, [role="navigation"], header nav');
    if (navEl) {
      const links = navEl.querySelectorAll('a');
      nav.navLinks = Array.from(links).slice(0, 12).map(a => ({
        text: a.textContent.trim(),
        href: a.href
      })).filter(l => l.text.length > 0 && l.text.length < 30);
    }

    // Footer links
    const footer = document.querySelector('footer, [role="contentinfo"]');
    if (footer) {
      const links = footer.querySelectorAll('a');
      nav.footerLinks = Array.from(links).slice(0, 30).map(a => ({
        text: a.textContent.trim(),
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
