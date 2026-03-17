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

    // Scan key elements for colors
    const colorSources = [
      { sel: 'a', prop: 'color', usage: 'Links' },
      { sel: 'button, [role="button"], .btn', prop: 'background-color', usage: 'Buttons' },
      { sel: 'button, [role="button"], .btn', prop: 'color', usage: 'Button text' },
      { sel: 'nav a, [role="navigation"] a', prop: 'color', usage: 'Navigation' },
      { sel: 'h1, h2, h3', prop: 'color', usage: 'Headlines' },
      { sel: 'p', prop: 'color', usage: 'Body text' },
      { sel: 'time, .date, .timestamp, [class*="meta"]', prop: 'color', usage: 'Timestamps' },
      { sel: 'header, [role="banner"]', prop: 'background-color', usage: 'Header background' },
      { sel: 'footer, [role="contentinfo"]', prop: 'background-color', usage: 'Footer background' },
      { sel: 'body', prop: 'background-color', usage: 'Page background' },
      { sel: 'section, [class*="section"], [class*="container"]', prop: 'background-color', usage: 'Section background' },
      { sel: 'hr, [class*="separator"], [class*="divider"]', prop: 'border-color', usage: 'Separators' },
      { sel: 'hr, [class*="separator"], [class*="divider"]', prop: 'background-color', usage: 'Separators' },
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
      return { name, hex: entry.color.hex, rgb: entry.color.rgb, usage: entry.usages };
    }

    // Detect accent-specific colors
    const yellowColors = accentColors.filter(c => c.color.r > 180 && c.color.g > 140 && c.color.b < 80);
    const redColors = accentColors.filter(c => c.color.r > 180 && c.color.g < 100 && c.color.b < 100);
    const greenColors = accentColors.filter(c => c.color.g > 100 && c.color.r < 100 && c.color.b < 100);
    const blueColors = accentColors.filter(c => c.color.b > 150 && c.color.r < 100 && c.color.g < 180);

    const colors = {
      primary: buildColorEntry(accentColors[0], 'Primary Accent') || { name: 'Default Blue', hex: '#2196F3', rgb: 'rgb(33, 150, 243)', usage: [] },
      text: {
        primary: buildColorEntry(textColors[0], 'Primary Text') || { name: 'Near Black', hex: '#1A1A2E', rgb: 'rgb(26, 26, 46)', usage: ['Headlines'] },
        secondary: buildColorEntry(textColors[Math.floor(textColors.length * 0.4)] || textColors[1], 'Secondary Text') || { name: 'Dark Gray', hex: '#4A4A5A', rgb: 'rgb(74, 74, 90)', usage: ['Body text'] },
        tertiary: buildColorEntry(textColors[Math.floor(textColors.length * 0.7)] || textColors[2], 'Tertiary Text') || { name: 'Medium Gray', hex: '#8A8A9A', rgb: 'rgb(138, 138, 154)', usage: ['Timestamps'] },
      },
      backgrounds: {
        base: buildColorEntry(bgColors.find(c => luminance(c.color) > 245), 'White') || { name: 'White', hex: '#FFFFFF', rgb: 'rgb(255, 255, 255)', usage: ['Page background'] },
        section: buildColorEntry(bgColors.find(c => luminance(c.color) > 230 && luminance(c.color) < 250), 'Section') || { name: 'Off-White', hex: '#F7F9FC', rgb: 'rgb(247, 249, 252)', usage: ['Section backgrounds'] },
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
    const fallbackFonts = sortedFonts.filter(([f]) => genericFonts.includes(f)).map(([f]) => f).slice(0, 3);

    const fonts = { primary: null, secondary: null, tertiary: [], type_scale: {} };

    if (customFonts.length > 0) {
      fonts.primary = {
        family: customFonts[0][0],
        fallbacks: fallbackFonts.length > 0 ? fallbackFonts : ['sans-serif'],
        weights: {},
        usage: (fontElementMap[customFonts[0][0]] || []).join(', ')
      };
      // Detect weights
      const h1 = document.querySelector('h1');
      const p = document.querySelector('p');
      if (h1) fonts.primary.weights.bold = parseInt(getCS(h1, 'font-weight')) || 700;
      if (p) fonts.primary.weights.regular = parseInt(getCS(p, 'font-weight')) || 400;
    }

    if (customFonts.length > 1) {
      const secFamily = customFonts[1][0];
      const secIsSerif = /serif|Georgia|Times|Merriweather|Playfair|Lora|Roboto\s*Serif/i.test(secFamily);
      fonts.secondary = {
        family: secFamily,
        weight: 600,
        style: secIsSerif ? 'italic' : 'normal',
        usage: (fontElementMap[secFamily] || []).join(', ')
      };
    }

    if (customFonts.length > 2) {
      fonts.tertiary = customFonts.slice(2, 5).map(([f]) => ({
        family: f,
        usage: (fontElementMap[f] || []).join(', ')
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
        };
        // Remove undefined values
        Object.keys(fonts.type_scale[role]).forEach(k => {
          if (fonts.type_scale[role][k] === undefined) delete fonts.type_scale[role][k];
        });
      } else {
        fonts.type_scale[role] = { ...fallback, family: fonts.primary?.family || 'sans-serif' };
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

    return { brand, logos, colors, fonts, brand_voice, photo_style, graphics, icons, layout_patterns, spacing };
  });

  // Add metadata
  extracted.metadata = {
    analysis_date: new Date().toISOString().split('T')[0],
    source_url: url,
    analysis_method: 'Automated web crawling with Puppeteer computed style extraction'
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

module.exports = { extractBrandKit, extractContent, extractNavigation };
