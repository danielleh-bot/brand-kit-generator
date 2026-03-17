// ============================================================
//  EXTRACTORS
// ============================================================
function extractColors(doc) {
    const colorMap = {};
    const colorCounts = {};

    // Get all computed styles from inline styles + style tags
    const styleText = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');
    const inlineStyles = Array.from(doc.querySelectorAll('[style]')).map(el => el.getAttribute('style')).join(';');
    const allCSS = styleText + inlineStyles;

    // Extract hex colors
    const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
    let match;
    while ((match = hexRegex.exec(allCSS)) !== null) {
        const hex = normalizeHex(match[0]);
        if (hex && !isGrayscale(hex)) {
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
    }

    // Extract rgb/rgba colors
    const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
    while ((match = rgbRegex.exec(allCSS)) !== null) {
        const hex = rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
        if (hex && !isGrayscale(hex)) {
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
    }

    // Extract CSS custom properties
    const varRegex = /--[\w-]+\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/g;
    while ((match = varRegex.exec(allCSS)) !== null) {
        // These are weighted more heavily
        const val = match[1];
        let hex;
        if (val.startsWith('#')) hex = normalizeHex(val);
        else {
            const rgb = val.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (rgb) hex = rgbToHex(parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3]));
        }
        if (hex) colorCounts[hex] = (colorCounts[hex] || 0) + 5;
    }

    // Sort by frequency and classify
    const sorted = Object.entries(colorCounts).sort((a,b) => b[1] - a[1]);
    const brandColors = sorted.filter(([hex]) => !isNearBlackOrWhite(hex));

    // Extract grayscale text colors
    const grayRegex = /#([0-9a-fA-F]{6})\b/g;
    const allGrays = [];
    let gMatch;
    while ((gMatch = grayRegex.exec(allCSS)) !== null) {
        const hex = '#' + gMatch[1].toUpperCase();
        if (isTextGray(hex)) allGrays.push(hex);
    }
    const uniqueGrays = [...new Set(allGrays)].sort((a,b) => luminance(a) - luminance(b));

    // Assign tokens
    if (brandColors.length > 0) colorMap["colors.primary.hex"] = brandColors[0][0];
    if (brandColors.length > 1) colorMap["colors.secondary.hex"] = brandColors[1][0];
    if (brandColors.length > 2) colorMap["colors.tertiary.hex"] = brandColors[2][0];

    // Text hierarchy
    if (uniqueGrays.length >= 1) colorMap["colors.text.primary.hex"] = uniqueGrays[0] || '#1A1A2E';
    if (uniqueGrays.length >= 2) colorMap["colors.text.secondary.hex"] = uniqueGrays[Math.floor(uniqueGrays.length * 0.4)] || '#4A4A5A';
    if (uniqueGrays.length >= 3) colorMap["colors.text.tertiary.hex"] = uniqueGrays[Math.floor(uniqueGrays.length * 0.7)] || '#8A8A9A';

    // Backgrounds
    const bgRegex = /background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[^)]+\))/g;
    const bgColors = [];
    while ((match = bgRegex.exec(allCSS)) !== null) {
        let hex;
        if (match[1].startsWith('#')) hex = normalizeHex(match[1]);
        else {
            const rgb = match[1].match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (rgb) hex = rgbToHex(parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3]));
        }
        if (hex && isLightColor(hex)) bgColors.push(hex);
    }
    const uniqueBgs = [...new Set(bgColors)];
    if (uniqueBgs.length > 0) colorMap["colors.backgrounds.page.hex"] = uniqueBgs[0];
    if (uniqueBgs.length > 1) colorMap["colors.backgrounds.section.hex"] = uniqueBgs[1];
    if (uniqueBgs.length > 2) colorMap["colors.backgrounds.secondary.hex"] = uniqueBgs[2];

    // Border color
    const borderRegex = /border[^:]*:\s*[^;]*?(#[0-9a-fA-F]{6})/g;
    while ((match = borderRegex.exec(allCSS)) !== null) {
        const hex = normalizeHex(match[1]);
        if (hex && isLightColor(hex)) {
            colorMap["colors.borders.primary.hex"] = hex;
            break;
        }
    }

    return colorMap;
}

function extractFonts(doc, html) {
    const fontMap = {};
    const allCSS = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');

    // Extract Google Fonts from link tags
    const googleFonts = [];
    doc.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(link => {
        const href = link.getAttribute('href') || '';
        const familyMatch = href.match(/family=([^&]+)/);
        if (familyMatch) {
            familyMatch[1].split('|').forEach(f => {
                const name = decodeURIComponent(f.split(':')[0].replace(/\+/g, ' '));
                googleFonts.push(name);
            });
        }
        // CSS2 format
        const css2Matches = href.matchAll(/family=([^:&]+)/g);
        for (const m of css2Matches) {
            const name = decodeURIComponent(m[1].replace(/\+/g, ' '));
            if (!googleFonts.includes(name)) googleFonts.push(name);
        }
    });

    // Extract font-family declarations
    const ffRegex = /font-family\s*:\s*['"]?([^'";},]+)/g;
    const fontFamilies = {};
    let match;
    while ((match = ffRegex.exec(allCSS)) !== null) {
        const family = match[1].trim().replace(/['"]/g, '');
        if (!family.startsWith('-') && family !== 'inherit' && family !== 'initial') {
            fontFamilies[family] = (fontFamilies[family] || 0) + 1;
        }
    }

    // Combine and rank
    const allFonts = [...new Set([...googleFonts, ...Object.keys(fontFamilies)])];
    const primaryFonts = allFonts.filter(f => !['sans-serif','serif','monospace','Arial','Helvetica','Times New Roman','Georgia','Verdana','system-ui'].includes(f));
    const fallbacks = allFonts.filter(f => ['Arial','Helvetica','sans-serif','serif','Georgia','Verdana'].includes(f));

    if (primaryFonts.length > 0) {
        fontMap["fonts.primary.family"] = primaryFonts[0];
        fontMap["fonts.primary.fallbacks"] = fallbacks.length > 0 ? fallbacks.slice(0,3) : ["sans-serif"];
    }
    if (primaryFonts.length > 1) {
        fontMap["fonts.secondary.family"] = primaryFonts[1];
        // Detect if it's a serif font
        const isSerif = /serif/i.test(primaryFonts[1]) || /Georgia|Times|Merriweather|Playfair|Lora/i.test(primaryFonts[1]);
        if (isSerif) fontMap["fonts.secondary.style"] = "italic";
    }

    // Extract type scale
    const sizeRegex = /font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/g;
    const sizes = [];
    while ((match = sizeRegex.exec(allCSS)) !== null) {
        let px = parseFloat(match[1]);
        if (match[2] === 'rem' || match[2] === 'em') px *= 16;
        sizes.push(Math.round(px));
    }
    const uniqueSizes = [...new Set(sizes)].sort((a,b) => b - a);

    if (uniqueSizes.length >= 1) {
        fontMap["fonts.type_scale.headline_large"] = { size: uniqueSizes[0] + 'px', weight: 700, line_height: Math.round(uniqueSizes[0] * 1.2) + 'px' };
    }
    if (uniqueSizes.length >= 2) {
        const cardSize = uniqueSizes.find(s => s >= 18 && s <= 26) || uniqueSizes[1];
        fontMap["fonts.type_scale.article_title_card"] = { size: cardSize + 'px', weight: 700, line_height: Math.round(cardSize * 1.2) + 'px' };
    }
    if (uniqueSizes.length >= 3) {
        fontMap["fonts.type_scale.section_headings"] = { size: (uniqueSizes.find(s => s >= 28 && s <= 40) || 36) + 'px', weight: 700 };
    }
    if (uniqueSizes.length >= 2) {
        const bodySize = uniqueSizes.find(s => s >= 14 && s <= 18) || 16;
        fontMap["fonts.type_scale.body_text"] = { size: bodySize + 'px', weight: 400, line_height: Math.round(bodySize * 1.6) + 'px' };
    }
    const metaSize = uniqueSizes.find(s => s >= 11 && s <= 14) || 13;
    fontMap["fonts.type_scale.meta_text"] = { size: metaSize + 'px', weight: 400 };

    return fontMap;
}

function extractLayout(doc) {
    const layoutMap = {};
    const allCSS = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');

    // Border radius
    const brRegex = /border-radius\s*:\s*(\d+(?:\.\d+)?)(px|%)/g;
    const radii = [];
    let match;
    while ((match = brRegex.exec(allCSS)) !== null) {
        if (match[2] === 'px') radii.push(parseFloat(match[1]));
    }
    const commonRadius = radii.length > 0 ? mode(radii) : 0;
    layoutMap["photo_style.thumbnail_format.border_radius"] = commonRadius + 'px';
    layoutMap["layout.card.border_radius"] = commonRadius + 'px';

    // Max width
    const mwRegex = /max-width\s*:\s*(\d+)px/g;
    const widths = [];
    while ((match = mwRegex.exec(allCSS)) !== null) {
        const w = parseInt(match[1]);
        if (w >= 900 && w <= 1600) widths.push(w);
    }
    if (widths.length > 0) layoutMap["layout.container.max_width"] = mode(widths) + 'px';

    // Grid gaps
    const gapRegex = /gap\s*:\s*(\d+)px/g;
    const gaps = [];
    while ((match = gapRegex.exec(allCSS)) !== null) {
        gaps.push(parseInt(match[1]));
    }
    if (gaps.length > 0) {
        layoutMap["layout.grid.gap"] = mode(gaps) + 'px';
    }

    // Aspect ratio
    const arRegex = /aspect-ratio\s*:\s*(\d+)\s*\/\s*(\d+)/g;
    while ((match = arRegex.exec(allCSS)) !== null) {
        layoutMap["photo_style.thumbnail_format.aspect_ratio"] = match[1] + ':' + match[2];
        break;
    }
    if (!layoutMap["photo_style.thumbnail_format.aspect_ratio"]) {
        layoutMap["photo_style.thumbnail_format.aspect_ratio"] = "16:9";
    }

    // Spacing scale
    const padRegex = /padding\s*:\s*(\d+)px/g;
    const pads = [];
    while ((match = padRegex.exec(allCSS)) !== null) {
        pads.push(parseInt(match[1]));
    }
    if (pads.length > 0) {
        const sorted = [...new Set(pads)].sort((a,b) => a - b);
        layoutMap["layout.spacing.xs"] = (sorted[0] || 4) + 'px';
        layoutMap["layout.spacing.sm"] = (sorted[Math.floor(sorted.length*0.25)] || 8) + 'px';
        layoutMap["layout.spacing.md"] = (sorted[Math.floor(sorted.length*0.5)] || 16) + 'px';
        layoutMap["layout.spacing.lg"] = (sorted[Math.floor(sorted.length*0.75)] || 24) + 'px';
        layoutMap["layout.spacing.xl"] = (sorted[sorted.length-1] || 48) + 'px';
    }

    return layoutMap;
}

function extractArticleData(doc, url) {
    const data = {
        url: url,
        title: '',
        kicker: '',
        author: '',
        date: '',
        heroImage: '',
        lead: '',
        paragraphs: [],
        siteName: ''
    };

    // Title
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    const h1 = doc.querySelector('h1');
    data.title = ogTitle ? ogTitle.content : (h1 ? h1.textContent.trim() : 'Untitled Article');

    // Description / lead
    const ogDesc = doc.querySelector('meta[property="og:description"]');
    const metaDesc = doc.querySelector('meta[name="description"]');
    data.lead = ogDesc ? ogDesc.content : (metaDesc ? metaDesc.content : '');

    // Image
    const ogImg = doc.querySelector('meta[property="og:image"]');
    data.heroImage = ogImg ? ogImg.content : '';

    // Site name
    const ogSite = doc.querySelector('meta[property="og:site_name"]');
    data.siteName = ogSite ? ogSite.content : '';

    // Author
    const authorMeta = doc.querySelector('meta[name="author"]');
    const authorEl = doc.querySelector('[class*="author"], [rel="author"]');
    data.author = authorMeta ? authorMeta.content : (authorEl ? authorEl.textContent.trim() : 'Staff Writer');

    // Date
    const dateMeta = doc.querySelector('meta[property="article:published_time"], time[datetime]');
    if (dateMeta) {
        const d = dateMeta.content || dateMeta.getAttribute('datetime');
        try { data.date = new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch(e) {}
    }
    if (!data.date) data.date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Paragraphs from article body
    const article = doc.querySelector('article') || doc.querySelector('[class*="article-body"], [class*="story-body"], [class*="content-body"]') || doc.body;
    if (article) {
        article.querySelectorAll('p').forEach(p => {
            const text = p.textContent.trim();
            if (text.length > 40) data.paragraphs.push(text);
        });
    }
    if (data.paragraphs.length === 0) {
        data.paragraphs = [data.lead || 'Article content would appear here in the full prototype.'];
    }

    return data;
}

function extractBrandSignals(doc, html, pubUrl) {
    const signals = {};

    // Detect brand mark / favicon
    const favicon = doc.querySelector('link[rel*="icon"]');
    if (favicon) {
        const href = favicon.getAttribute('href');
        if (href) {
            try {
                signals["logos.favicon.url"] = new URL(href, pubUrl).href;
            } catch(e) {
                signals["logos.favicon.url"] = href;
            }
        }
    }

    // Detect site name
    const ogSite = doc.querySelector('meta[property="og:site_name"]');
    if (ogSite) signals["brand.site_name"] = ogSite.content;

    // Detect theme color
    const themeColor = doc.querySelector('meta[name="theme-color"]');
    if (themeColor) {
        signals["brand.theme_color"] = themeColor.content;
        // This is a strong primary color signal
        if (!signals["colors.primary.hex"]) signals["colors.primary.hex"] = themeColor.content;
    }

    // Detect content labels (opinion, live, breaking, etc.)
    const labelPatterns = ['opinion', 'meinung', 'kommentar', 'editorial', 'analysis', 'live', 'breaking', 'eilmeldung', 'video', 'gallery'];
    const textContent = doc.body ? doc.body.textContent.toLowerCase() : html.toLowerCase();
    labelPatterns.forEach(label => {
        if (textContent.includes(label)) {
            signals[`brand_voice.content_labels.${label}`] = true;
        }
    });

    // Video indicator
    if (html.includes('video') || html.includes('player')) {
        signals["photo_style.video_thumbnails.has_video_content"] = true;
    }

    return signals;
}
