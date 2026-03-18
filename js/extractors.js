// ============================================================
//  EXTRACTORS — Rich Brand Kit Extraction
//  Produces nested JSON matching the t-online reference structure
// ============================================================

// ============================================================
//  1. COLOR EXTRACTION
// ============================================================
function extractColors(doc) {
    const allCSS = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');
    const inlineStyles = Array.from(doc.querySelectorAll('[style]')).map(el => el.getAttribute('style')).join(';');
    const fullCSS = allCSS + inlineStyles;

    // --- Collect all colors with context ---
    const colorContexts = {}; // hex -> { count, contexts: Set }

    function trackColor(hex, context) {
        if (!hex) return;
        hex = normalizeHex(hex);
        if (!hex) return;
        if (!colorContexts[hex]) colorContexts[hex] = { count: 0, contexts: new Set() };
        colorContexts[hex].count++;
        if (context) colorContexts[hex].contexts.add(context);
    }

    // Extract hex colors with context
    const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
    let match;
    while ((match = hexRegex.exec(fullCSS)) !== null) {
        const hex = normalizeHex(match[0]);
        if (hex) trackColor(hex, 'CSS declaration');
    }

    // Extract rgb/rgba colors
    const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
    while ((match = rgbRegex.exec(fullCSS)) !== null) {
        const hex = rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
        if (hex) trackColor(hex, 'CSS declaration');
    }

    // CSS custom properties (weighted more heavily)
    const varRegex = /--[\w-]+\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/g;
    while ((match = varRegex.exec(allCSS)) !== null) {
        const val = match[1];
        let hex;
        if (val.startsWith('#')) hex = normalizeHex(val);
        else {
            const rgb = val.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (rgb) hex = rgbToHex(parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3]));
        }
        if (hex) {
            trackColor(hex, 'CSS custom property');
            // Extra weight for CSS vars
            colorContexts[hex].count += 4;
        }
    }

    // Track colors by CSS property for usage hints
    const colorUsageMap = {};
    const propPatterns = [
        { regex: /(?:^|[;{])\s*color\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/gm, usage: 'Text color' },
        { regex: /background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/gm, usage: 'Background' },
        { regex: /border[^:]*:\s*[^;]*?(#[0-9a-fA-F]{3,8})/gm, usage: 'Border' },
        { regex: /(?:box-shadow|text-shadow)\s*:[^;]*(#[0-9a-fA-F]{3,8})/gm, usage: 'Shadow' },
    ];
    for (const { regex, usage } of propPatterns) {
        while ((match = regex.exec(fullCSS)) !== null) {
            let hex;
            if (match[1].startsWith('#')) hex = normalizeHex(match[1]);
            else {
                const rgb = match[1].match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                if (rgb) hex = rgbToHex(parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3]));
            }
            if (hex) {
                if (!colorUsageMap[hex]) colorUsageMap[hex] = new Set();
                colorUsageMap[hex].add(usage);
            }
        }
    }

    // --- Classify colors ---
    const allColors = Object.entries(colorContexts).sort((a, b) => b[1].count - a[1].count);
    const brandColors = allColors.filter(([hex]) => !isNearBlackOrWhite(hex) && !isGrayscale(hex));
    const grayColors = allColors.filter(([hex]) => isGrayscale(hex) || isTextGray(hex));
    const darkGrays = grayColors.filter(([hex]) => luminance(hex) < 100).sort((a, b) => luminance(a[0]) - luminance(b[0]));
    const lightGrays = grayColors.filter(([hex]) => luminance(hex) > 180).sort((a, b) => luminance(b[0]) - luminance(a[0]));

    // --- Extract background colors ---
    const bgRegex = /background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[^)]+\))/g;
    const lightBgs = [];
    const darkBgs = [];
    while ((match = bgRegex.exec(fullCSS)) !== null) {
        let hex;
        if (match[1].startsWith('#')) hex = normalizeHex(match[1]);
        else {
            const rgb = match[1].match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (rgb) hex = rgbToHex(parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3]));
        }
        if (hex) {
            if (isLightColor(hex)) lightBgs.push(hex);
            else if (isDarkColor(hex)) darkBgs.push(hex);
        }
    }

    // --- Build color usage arrays ---
    function getUsage(hex) {
        const usages = [];
        if (colorUsageMap[hex]) usages.push(...colorUsageMap[hex]);
        if (colorContexts[hex]?.contexts) {
            for (const ctx of colorContexts[hex].contexts) {
                if (!usages.includes(ctx)) usages.push(ctx);
            }
        }
        return usages;
    }

    // --- Detect accent colors (non-primary brand colors that appear in specific contexts) ---
    const accentCandidates = brandColors.slice(1).filter(([hex]) => {
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        return (max - min) > 50; // reasonably saturated
    });

    // Detect specific accent types by hue
    function getHue(hex) {
        const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
        const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
        if (d === 0) return 0;
        let h;
        if (max === r) h = ((g-b)/d + (g<b?6:0)) * 60;
        else if (max === g) h = ((b-r)/d + 2) * 60;
        else h = ((r-g)/d + 4) * 60;
        return h;
    }

    const accents = {};
    for (const [hex] of accentCandidates.slice(0, 10)) {
        const hue = getHue(hex);
        const lum = luminance(hex);
        if (hue >= 340 || hue < 20) { // Red
            if (!accents.negative_red) accents.negative_red = { name: 'Negative Red', hex, rgb: hexToRgbString(hex), usage: 'Error states, negative indicators' };
        } else if (hue >= 40 && hue < 70) { // Yellow
            if (!accents.warning_yellow) accents.warning_yellow = { name: 'Warning Yellow', hex, rgb: hexToRgbString(hex), usage: 'Warnings, breaking news indicators' };
        } else if (hue >= 90 && hue < 170) { // Green
            if (!accents.positive_green) accents.positive_green = { name: 'Positive Green', hex, rgb: hexToRgbString(hex), usage: 'Success states, positive indicators' };
        } else if (hue >= 190 && hue < 260) { // Blue
            if (!accents.info_blue) accents.info_blue = { name: 'Info Blue', hex, rgb: hexToRgbString(hex), usage: 'Informational links, highlights' };
        }
    }

    // --- Extract border color ---
    const borderRegex = /border[^:]*:\s*[^;]*?(#[0-9a-fA-F]{6})/g;
    let borderColor = null;
    while ((match = borderRegex.exec(allCSS)) !== null) {
        const hex = normalizeHex(match[1]);
        if (hex && isLightColor(hex)) { borderColor = hex; break; }
    }

    // --- Assemble result ---
    const primary = brandColors.length > 0 ? brandColors[0][0] : '#2196F3';
    const secondary = brandColors.length > 1 ? brandColors[1][0] : null;
    const tertiary = brandColors.length > 2 ? brandColors[2][0] : null;

    const textPrimary = darkGrays.length >= 1 ? darkGrays[0][0] : '#1A1A2E';
    const textSecondary = darkGrays.length >= 2 ? darkGrays[Math.floor(darkGrays.length * 0.4)][0] : '#4A4A5A';
    const textTertiary = darkGrays.length >= 3 ? darkGrays[Math.floor(darkGrays.length * 0.7)][0] : '#8A8A9A';

    const bgBase = lightBgs.length > 0 ? lightBgs[0] : '#FFFFFF';
    const bgSection = lightBgs.length > 1 ? lightBgs[1] : '#F7F9FC';
    const bgSecondaryBg = lightBgs.length > 2 ? lightBgs[2] : '#EBEFF7';
    const bgDark = darkBgs.length > 0 ? darkBgs[0] : (darkGrays.length > 0 ? darkGrays[0][0] : '#171B26');

    return {
        primary: {
            name: colorName(primary),
            hex: primary,
            rgb: hexToRgbString(primary),
            usage: getUsage(primary).length > 0 ? getUsage(primary) : ['Primary brand color', 'CTA buttons', 'Active states', 'Accent elements']
        },
        secondary: secondary ? {
            name: colorName(secondary),
            hex: secondary,
            rgb: hexToRgbString(secondary),
            usage: getUsage(secondary).length > 0 ? getUsage(secondary) : ['Secondary brand color']
        } : null,
        tertiary: tertiary ? {
            name: colorName(tertiary),
            hex: tertiary,
            rgb: hexToRgbString(tertiary),
            usage: getUsage(tertiary).length > 0 ? getUsage(tertiary) : ['Tertiary accent']
        } : null,
        text: {
            primary: { name: colorName(textPrimary), hex: textPrimary, rgb: hexToRgbString(textPrimary), usage: 'Headlines, navigation items, primary body copy' },
            secondary: { name: colorName(textSecondary), hex: textSecondary, rgb: hexToRgbString(textSecondary), usage: 'Article body text, subheadings, secondary content' },
            tertiary: { name: colorName(textTertiary), hex: textTertiary, rgb: hexToRgbString(textTertiary), usage: 'Timestamps, meta information, captions, muted labels' }
        },
        backgrounds: {
            base: { name: colorName(bgBase), hex: bgBase, rgb: hexToRgbString(bgBase), usage: 'Main page background' },
            section: { name: colorName(bgSection), hex: bgSection, rgb: hexToRgbString(bgSection), usage: 'Section backgrounds, card containers, content separation' },
            secondary: { name: colorName(bgSecondaryBg), hex: bgSecondaryBg, rgb: hexToRgbString(bgSecondaryBg), usage: 'Filter pill backgrounds, secondary containers' },
            dark: { name: colorName(bgDark), hex: bgDark, rgb: hexToRgbString(bgDark), usage: 'Footer background, dark sections' }
        },
        borders: {
            primary: borderColor ? { name: colorName(borderColor), hex: borderColor, rgb: hexToRgbString(borderColor), usage: 'Card borders, separators' } : null
        },
        accents: Object.keys(accents).length > 0 ? accents : null
    };
}

// ============================================================
//  2. FONT EXTRACTION
// ============================================================
function extractFonts(doc, html) {
    const allCSS = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');

    // --- Extract Google Fonts from link tags ---
    const googleFonts = [];
    doc.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(link => {
        const href = link.getAttribute('href') || '';
        const familyMatch = href.match(/family=([^&]+)/);
        if (familyMatch) {
            familyMatch[1].split('|').forEach(f => {
                const name = decodeURIComponent(f.split(':')[0].replace(/\+/g, ' '));
                if (!googleFonts.includes(name)) googleFonts.push(name);
            });
        }
        const css2Matches = href.matchAll(/family=([^:&]+)/g);
        for (const m of css2Matches) {
            const name = decodeURIComponent(m[1].replace(/\+/g, ' '));
            if (!googleFonts.includes(name)) googleFonts.push(name);
        }
    });

    // --- Extract font-family declarations with frequency ---
    const ffRegex = /font-family\s*:\s*['"]?([^'";},]+)/g;
    const fontFamilies = {};
    let match;
    while ((match = ffRegex.exec(allCSS)) !== null) {
        const family = match[1].trim().replace(/['"]/g, '').split(',')[0].trim();
        if (!family.startsWith('-') && family !== 'inherit' && family !== 'initial' && family !== 'unset') {
            fontFamilies[family] = (fontFamilies[family] || 0) + 1;
        }
    }

    // --- Extract font-weight values per family ---
    const weightsByFamily = {};
    const fwRegex = /font-family\s*:\s*['"]?([^'";},]+)[^}]*?font-weight\s*:\s*(\d+|bold|normal)/gm;
    while ((match = fwRegex.exec(allCSS)) !== null) {
        const family = match[1].trim().replace(/['"]/g, '').split(',')[0].trim();
        let weight = match[2];
        if (weight === 'bold') weight = 700;
        else if (weight === 'normal') weight = 400;
        else weight = parseInt(weight);
        if (!weightsByFamily[family]) weightsByFamily[family] = new Set();
        weightsByFamily[family].add(weight);
    }
    // Also scan standalone font-weight declarations
    const fwStandalone = /font-weight\s*:\s*(\d+|bold|normal|lighter|bolder)/g;
    const allWeights = new Set();
    while ((match = fwStandalone.exec(allCSS)) !== null) {
        let w = match[1];
        if (w === 'bold') w = 700;
        else if (w === 'normal') w = 400;
        else if (w === 'lighter' || w === 'bolder') continue;
        else w = parseInt(w);
        if (!isNaN(w)) allWeights.add(w);
    }

    // --- Rank and classify fonts ---
    const genericFonts = ['sans-serif','serif','monospace','cursive','fantasy','Arial','Helvetica','Times New Roman','Georgia','Verdana','Courier New','system-ui','ui-sans-serif','ui-serif'];
    const allFonts = [...new Set([...googleFonts, ...Object.keys(fontFamilies)])];
    const primaryFonts = allFonts.filter(f => !genericFonts.includes(f));
    const fallbackPool = allFonts.filter(f => ['Arial','Helvetica','sans-serif','serif','Georgia','Verdana'].includes(f));

    // Detect serif fonts
    const isSerif = (name) => /serif/i.test(name) && !/sans-serif/i.test(name) || /Georgia|Times|Merriweather|Playfair|Lora|Roboto\s*Serif|Crimson|Libre\s*Baskerville|Source\s*Serif/i.test(name);

    const primaryFont = primaryFonts.length > 0 ? primaryFonts[0] : 'sans-serif';
    const primaryFallbacks = fallbackPool.length > 0 ? fallbackPool.slice(0, 3) : ['sans-serif'];
    const primaryWeights = {};
    const pw = weightsByFamily[primaryFont] || allWeights;
    if (pw.has(400)) primaryWeights.regular = 400;
    if (pw.has(700) || pw.has(600)) primaryWeights.bold = pw.has(700) ? 700 : 600;

    let secondaryFont = null;
    let secondaryStyle = null;
    if (primaryFonts.length > 1) {
        secondaryFont = primaryFonts[1];
        if (isSerif(secondaryFont)) secondaryStyle = 'italic';
    }

    const tertiaryFonts = primaryFonts.slice(2).map(f => ({
        family: f,
        usage: 'Limited use in certain widgets'
    }));

    // --- Extract text-transform values ---
    const ttRegex = /text-transform\s*:\s*(uppercase|lowercase|capitalize|none)/g;
    const transforms = {};
    while ((match = ttRegex.exec(allCSS)) !== null) {
        transforms[match[1]] = (transforms[match[1]] || 0) + 1;
    }
    const hasUppercase = transforms['uppercase'] > 0;

    // --- Extract letter-spacing ---
    const lsRegex = /letter-spacing\s*:\s*([\d.]+(?:px|em|rem))/g;
    const letterSpacings = [];
    while ((match = lsRegex.exec(allCSS)) !== null) {
        letterSpacings.push(match[1]);
    }

    // --- Extract font sizes for type scale ---
    const sizeRegex = /font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/g;
    const sizes = [];
    while ((match = sizeRegex.exec(allCSS)) !== null) {
        let px = parseFloat(match[1]);
        if (match[2] === 'rem' || match[2] === 'em') px *= 16;
        sizes.push(Math.round(px));
    }
    const uniqueSizes = [...new Set(sizes)].sort((a, b) => b - a);

    // --- Build type scale ---
    const findSize = (min, max) => uniqueSizes.find(s => s >= min && s <= max);

    const sectionHeadingSize = findSize(32, 48) || 36;
    const heroSize = findSize(28, 38) || uniqueSizes[0] || 34;
    const cardTitleSize = findSize(20, 26) || 22;
    const leadSize = findSize(17, 20) || 18;
    const bodySize = findSize(15, 18) || 16;
    const navSize = findSize(13, 17) || 15;
    const metaSize = findSize(11, 14) || 13;
    const pillSize = findSize(13, 15) || 14;
    const buttonSize = findSize(13, 17) || 14;

    const typeScale = {
        section_headings: {
            size: sectionHeadingSize + 'px',
            weight: 700,
            family: primaryFont,
            style: 'Bold' + (hasUppercase ? ', uppercase' : ''),
            case: 'sentence case'
        },
        article_title_hero: {
            size: heroSize + 'px',
            weight: 700,
            family: primaryFont,
            line_height: Math.round(heroSize * 1.2) + 'px'
        },
        article_title_card: {
            size: cardTitleSize + 'px',
            weight: 700,
            family: primaryFont,
            line_height: Math.round(cardTitleSize * 1.2) + 'px'
        },
        article_lead: {
            size: leadSize + 'px',
            weight: 700,
            family: primaryFont,
            line_height: Math.round(leadSize * 1.7) + 'px'
        },
        article_body: {
            size: bodySize + 'px',
            weight: 400,
            family: primaryFont,
            line_height: Math.round(bodySize * 1.7) + 'px'
        },
        navigation: {
            size: navSize + 'px',
            weight: 400,
            family: primaryFont
        },
        utility_bar: {
            size: metaSize + 'px',
            weight: 400,
            family: primaryFont
        },
        category_pills: {
            size: pillSize + 'px',
            weight: 400,
            family: primaryFont,
            style: 'Inside rounded bordered containers'
        },
        buttons: {
            size: buttonSize + 'px',
            weight: 700,
            family: primaryFont,
            text_transform: hasUppercase ? 'uppercase' : 'none',
            letter_spacing: letterSpacings.length > 0 ? letterSpacings[0] : 'normal'
        },
        opinion_headline: secondaryFont ? {
            size: (findSize(20, 30) || 24) + 'px',
            weight: 600,
            family: secondaryFont,
            style: 'italic'
        } : null
    };

    return {
        primary: {
            family: primaryFont,
            fallbacks: primaryFallbacks,
            weights: primaryWeights,
            usage: 'All UI text: headlines, navigation, body copy, buttons, labels'
        },
        secondary: secondaryFont ? {
            family: secondaryFont,
            weight: 600,
            style: secondaryStyle,
            usage: 'Opinion/editorial content, visually distinguished from primary'
        } : null,
        tertiary: tertiaryFonts.length > 0 ? tertiaryFonts : null,
        type_scale: typeScale
    };
}

// ============================================================
//  3. LAYOUT EXTRACTION
// ============================================================
function extractLayout(doc) {
    const allCSS = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');

    // --- Border radius ---
    const brRegex = /border-radius\s*:\s*(\d+(?:\.\d+)?)(px|%)/g;
    const radii = [];
    let match;
    while ((match = brRegex.exec(allCSS)) !== null) {
        if (match[2] === 'px') radii.push(parseFloat(match[1]));
    }
    const commonRadius = radii.length > 0 ? mode(radii) : 0;

    // --- Max width ---
    const mwRegex = /max-width\s*:\s*(\d+)px/g;
    const widths = [];
    while ((match = mwRegex.exec(allCSS)) !== null) {
        const w = parseInt(match[1]);
        if (w >= 900 && w <= 1600) widths.push(w);
    }
    const containerMaxWidth = widths.length > 0 ? mode(widths) + 'px' : '1200px';

    // --- Grid gaps ---
    const gapRegex = /gap\s*:\s*(\d+)px/g;
    const gaps = [];
    while ((match = gapRegex.exec(allCSS)) !== null) {
        gaps.push(parseInt(match[1]));
    }
    const gridGap = gaps.length > 0 ? mode(gaps) + 'px' : '24px';

    // --- Aspect ratio ---
    const arRegex = /aspect-ratio\s*:\s*(\d+)\s*\/\s*(\d+)/g;
    let aspectRatio = '16:9';
    while ((match = arRegex.exec(allCSS)) !== null) {
        aspectRatio = match[1] + ':' + match[2];
        break;
    }

    // --- Spacing scale ---
    const padRegex = /padding\s*:\s*(\d+)px/g;
    const pads = [];
    while ((match = padRegex.exec(allCSS)) !== null) {
        pads.push(parseInt(match[1]));
    }
    const spacing = {};
    if (pads.length > 0) {
        const sorted = [...new Set(pads)].sort((a, b) => a - b);
        spacing.xs = (sorted[0] || 4) + 'px';
        spacing.sm = (sorted[Math.floor(sorted.length * 0.25)] || 8) + 'px';
        spacing.md = (sorted[Math.floor(sorted.length * 0.5)] || 16) + 'px';
        spacing.lg = (sorted[Math.floor(sorted.length * 0.75)] || 24) + 'px';
        spacing.xl = (sorted[sorted.length - 1] || 48) + 'px';
    } else {
        spacing.xs = '4px'; spacing.sm = '8px'; spacing.md = '16px'; spacing.lg = '24px'; spacing.xl = '48px';
    }

    // --- Detect header structure ---
    const header = doc.querySelector('header') || doc.querySelector('[class*="header"]');
    const headerLayers = [];
    if (header) {
        const children = header.children;
        for (let i = 0; i < Math.min(children.length, 6); i++) {
            const el = children[i];
            const tag = el.tagName.toLowerCase();
            const cls = (el.className || '').toLowerCase();
            if (cls.includes('util') || cls.includes('top-bar') || cls.includes('toolbar')) headerLayers.push('Utility bar');
            else if (cls.includes('logo') || cls.includes('brand') || tag === 'a') headerLayers.push('Logo bar');
            else if (cls.includes('nav') || tag === 'nav') headerLayers.push('Main navigation');
            else if (cls.includes('search')) headerLayers.push('Search bar');
            else headerLayers.push('Header section');
        }
    }
    if (headerLayers.length === 0) headerLayers.push('Header');

    // --- Detect grid type ---
    const hasAside = doc.querySelector('aside') || doc.querySelector('[class*="sidebar"]');
    const gridType = hasAside ? 'Two-column layout (main content + sidebar)' : 'Single-column with full-width sections';

    // --- Detect footer structure ---
    const footer = doc.querySelector('footer') || doc.querySelector('[class*="footer"]');
    const footerSections = [];
    if (footer) {
        const footerHeadings = footer.querySelectorAll('h2, h3, h4, strong, [class*="heading"]');
        footerHeadings.forEach(h => {
            const text = h.textContent.trim();
            if (text && text.length < 60) footerSections.push(text);
        });
    }

    // --- Detect content card patterns ---
    const hasHeroImage = !!doc.querySelector('[class*="hero"], [class*="lead-image"], [class*="featured"]');
    const cardSelectors = doc.querySelectorAll('[class*="card"], [class*="story"], [class*="article-item"]');

    return {
        card: { border_radius: commonRadius + 'px' },
        container: { max_width: containerMaxWidth },
        grid: { gap: gridGap, type: gridType },
        spacing: spacing,
        photo_style: {
            thumbnail_format: {
                aspect_ratio: aspectRatio,
                border_radius: commonRadius + 'px'
            },
            video_thumbnails: {
                has_video_content: false // will be set by brand signals
            }
        },
        layout_patterns: {
            grid: gridType,
            header: { layers: headerLayers },
            content_cards: {
                hero: hasHeroImage ? 'Large image with headline overlay or below' : 'Standard card layout',
                standard: cardSelectors.length > 0 ? 'Thumbnail + headline card' : 'List-based layout',
                count_detected: cardSelectors.length
            },
            section_pattern: {
                heading: 'Bold with brand accent',
                filters: radii.some(r => r > 12) ? 'Rounded pill buttons for subcategories' : null
            },
            footer: {
                sections: footerSections.length > 0 ? footerSections : ['About', 'Contact', 'Legal']
            }
        }
    };
}

// ============================================================
//  4. ARTICLE DATA EXTRACTION
// ============================================================
function extractArticleData(doc, url) {
    const data = {
        url: url,
        title: '',
        kicker: '',
        author: '',
        date: '',
        heroImage: '',
        heroCaption: '',
        lead: '',
        paragraphs: [],
        siteName: '',
        section: ''
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

    // Section / category
    const ogSection = doc.querySelector('meta[property="article:section"]');
    const breadcrumb = doc.querySelector('[class*="breadcrumb"] a:last-of-type, [class*="kicker"], [class*="eyebrow"]');
    data.section = ogSection ? ogSection.content : (breadcrumb ? breadcrumb.textContent.trim() : '');
    data.kicker = data.section || '';

    // Author
    const authorMeta = doc.querySelector('meta[name="author"]');
    const authorEl = doc.querySelector('[class*="author"], [rel="author"], [class*="byline"]');
    data.author = authorMeta ? authorMeta.content : (authorEl ? authorEl.textContent.trim() : 'Staff Writer');

    // Date
    const dateMeta = doc.querySelector('meta[property="article:published_time"], time[datetime]');
    if (dateMeta) {
        const d = dateMeta.content || dateMeta.getAttribute('datetime');
        try { data.date = new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch(e) {}
    }
    if (!data.date) data.date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Hero image caption
    const caption = doc.querySelector('figcaption, [class*="caption"]');
    if (caption) data.heroCaption = caption.textContent.trim();

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

// ============================================================
//  5. BRAND SIGNALS EXTRACTION (Enhanced)
// ============================================================
function extractBrandSignals(doc, html, pubUrl) {
    const signals = {};

    // Favicon
    const favicon = doc.querySelector('link[rel*="icon"]');
    if (favicon) {
        const href = favicon.getAttribute('href');
        if (href) {
            try { signals.faviconUrl = new URL(href, pubUrl).href; }
            catch(e) { signals.faviconUrl = href; }
        }
    }

    // Site name
    const ogSite = doc.querySelector('meta[property="og:site_name"]');
    if (ogSite) signals.siteName = ogSite.content;

    // Theme color (strong primary signal)
    const themeColor = doc.querySelector('meta[name="theme-color"]');
    if (themeColor) signals.themeColor = themeColor.content;

    // Description
    const metaDesc = doc.querySelector('meta[name="description"]');
    const ogDesc = doc.querySelector('meta[property="og:description"]');
    signals.description = ogDesc ? ogDesc.content : (metaDesc ? metaDesc.content : '');

    // Language
    const htmlLang = doc.documentElement.getAttribute('lang');
    signals.language = htmlLang || 'en';

    // Owner / publisher from structured data or footer
    const footer = doc.querySelector('footer');
    if (footer) {
        const footerText = footer.textContent;
        const copyrightMatch = footerText.match(/(?:©|\(c\)|copyright)\s*\d{4}\s*([^.|\n]{3,50})/i);
        if (copyrightMatch) signals.owner = copyrightMatch[1].trim();
    }
    // Also try JSON-LD
    const jsonLd = doc.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
        try {
            const ld = JSON.parse(jsonLd.textContent);
            if (ld.publisher?.name) signals.owner = ld.publisher.name;
            if (ld.publisher?.logo?.url) signals.logoUrl = ld.publisher.logo.url;
        } catch(e) {}
    }

    // Logo detection — look in header/nav for img/svg
    const headerEl = doc.querySelector('header') || doc.querySelector('[class*="header"]');
    if (headerEl) {
        const logoImg = headerEl.querySelector('img[class*="logo"], img[alt*="logo"], [class*="logo"] img, [class*="brand"] img');
        if (logoImg) {
            const src = logoImg.getAttribute('src');
            if (src) {
                try { signals.logoUrl = signals.logoUrl || new URL(src, pubUrl).href; }
                catch(e) { signals.logoUrl = signals.logoUrl || src; }
            }
        }
        const logoSvg = headerEl.querySelector('[class*="logo"] svg, svg[class*="logo"]');
        if (logoSvg) {
            signals.logoSvg = logoSvg.outerHTML.substring(0, 2000); // cap size
            signals.logoType = 'svg';
        }
    }

    // Video content detection
    if (html.includes('<video') || html.includes('video-player') || html.includes('data-video')) {
        signals.hasVideoContent = true;
    }

    // Content label detection
    const labelPatterns = ['opinion', 'meinung', 'kommentar', 'editorial', 'analysis', 'live', 'breaking', 'eilmeldung', 'video', 'gallery', 'podcast', 'sponsored', 'advertorial'];
    const textContent = doc.body ? doc.body.textContent.toLowerCase() : html.toLowerCase();
    signals.contentLabels = {};
    labelPatterns.forEach(label => {
        if (textContent.includes(label)) {
            signals.contentLabels[label] = true;
        }
    });

    return signals;
}

// ============================================================
//  6. BRAND VOICE EXTRACTION (New)
// ============================================================
function extractBrandVoice(doc, html) {
    const voice = {};

    // Headline style analysis
    const headlines = [];
    doc.querySelectorAll('h1, h2, h3').forEach(h => {
        const text = h.textContent.trim();
        if (text.length > 10 && text.length < 200) headlines.push(text);
    });

    if (headlines.length > 0) {
        // Detect case pattern
        const uppercaseCount = headlines.filter(h => h === h.toUpperCase()).length;
        const sentenceCount = headlines.filter(h => h[0] === h[0].toUpperCase() && h.slice(1) !== h.slice(1).toUpperCase()).length;
        voice.headline_style = {
            format: 'Concise, factual',
            case: uppercaseCount > headlines.length * 0.5 ? 'ALL CAPS' : 'Sentence case',
            pattern: headlines.some(h => h.includes(':')) ? "Frequently uses 'topic: detail' pattern" : 'Direct declarative statements'
        };
    }

    // Detect content distinction (news vs opinion)
    const opinionLabels = doc.querySelectorAll('[class*="opinion"], [class*="meinung"], [class*="editorial"], [class*="commentary"]');
    if (opinionLabels.length > 0) {
        voice.content_distinction = {
            news: { label: null, description: 'Factual, objective reporting' },
            opinion: { label: 'Opinion/Editorial', description: 'Clearly labeled editorial and opinion content' }
        };
    }

    // Language detection
    const lang = doc.documentElement.getAttribute('lang');
    voice.language = lang || 'en';

    // Personality traits (heuristic based on site characteristics)
    voice.personality_traits = ['Authoritative', 'Direct', 'Accessible'];
    const bodyText = doc.body ? doc.body.textContent : '';
    if (bodyText.length > 50000) voice.personality_traits.push('Comprehensive');
    if (opinionLabels.length > 0) voice.personality_traits.push('Balanced');

    return voice;
}

// ============================================================
//  7. ICON EXTRACTION (New)
// ============================================================
function extractIcons(doc) {
    const icons = {
        style: 'Mixed icon set',
        count_detected: 0,
        icon_inventory: [],
        social_media_icons: null
    };

    // Count SVG icons
    const svgIcons = doc.querySelectorAll('svg');
    let iconSvgCount = 0;
    svgIcons.forEach(svg => {
        const w = parseInt(svg.getAttribute('width') || svg.style.width || '0');
        const h = parseInt(svg.getAttribute('height') || svg.style.height || '0');
        if ((w > 0 && w <= 64) || (h > 0 && h <= 64) || svg.closest('[class*="icon"]')) {
            iconSvgCount++;
        }
    });

    // Count img icons (small images)
    const imgIcons = doc.querySelectorAll('img');
    let iconImgCount = 0;
    imgIcons.forEach(img => {
        const w = parseInt(img.getAttribute('width') || '0');
        const h = parseInt(img.getAttribute('height') || '0');
        if ((w > 0 && w <= 48) || (h > 0 && h <= 48)) iconImgCount++;
    });

    icons.count_detected = iconSvgCount + iconImgCount;

    // Detect common icon patterns
    const iconClasses = [];
    doc.querySelectorAll('[class*="icon"]').forEach(el => {
        const cls = el.className.toString().toLowerCase();
        iconClasses.push(cls);
    });
    const iconText = iconClasses.join(' ');

    const iconPatterns = [
        { pattern: /menu|hamburger|burger/i, name: 'Hamburger Menu', description: 'Mobile navigation toggle' },
        { pattern: /search|magnif/i, name: 'Search', description: 'Search functionality' },
        { pattern: /mail|email|envelope/i, name: 'Email', description: 'Email/newsletter' },
        { pattern: /home|house/i, name: 'Home', description: 'Home navigation' },
        { pattern: /play|video/i, name: 'Play', description: 'Video content indicator' },
        { pattern: /share/i, name: 'Share', description: 'Content sharing' },
        { pattern: /arrow|chevron/i, name: 'Arrow/Chevron', description: 'Navigation arrows' },
        { pattern: /close|dismiss/i, name: 'Close', description: 'Dismiss/close action' },
        { pattern: /user|account|profile/i, name: 'User/Account', description: 'User account' },
        { pattern: /comment|chat/i, name: 'Comment', description: 'Comments/discussion' },
    ];

    for (const { pattern, name, description } of iconPatterns) {
        if (pattern.test(iconText)) {
            icons.icon_inventory.push({ name, description });
        }
    }

    // Detect SVG style
    const firstSvg = doc.querySelector('svg[viewBox]');
    if (firstSvg) {
        const hasStroke = firstSvg.querySelector('[stroke]') || firstSvg.getAttribute('stroke');
        const hasFill = firstSvg.querySelector('[fill]:not([fill="none"])');
        if (hasStroke && !hasFill) icons.style = 'Line-based, thin stroke weight, monochromatic';
        else if (hasFill) icons.style = 'Filled icons, monochromatic';
        else icons.style = 'Custom SVG icon set';
    }

    // Social media icons
    const socialLinks = [];
    const socialPatterns = [
        { pattern: /facebook\.com|fb\.com/i, name: 'Facebook' },
        { pattern: /twitter\.com|x\.com/i, name: 'X (Twitter)' },
        { pattern: /instagram\.com/i, name: 'Instagram' },
        { pattern: /youtube\.com/i, name: 'YouTube' },
        { pattern: /linkedin\.com/i, name: 'LinkedIn' },
        { pattern: /tiktok\.com/i, name: 'TikTok' },
        { pattern: /spotify\.com/i, name: 'Spotify' },
        { pattern: /pinterest\.com/i, name: 'Pinterest' },
    ];
    doc.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        for (const { pattern, name } of socialPatterns) {
            if (pattern.test(href) && !socialLinks.includes(name)) {
                socialLinks.push(name);
            }
        }
    });

    if (socialLinks.length > 0) {
        icons.social_media_icons = {
            platforms: socialLinks,
            placement: 'Footer or header'
        };
    }

    return icons;
}

// ============================================================
//  8. GRAPHICS EXTRACTION (New)
// ============================================================
function extractGraphics(doc, html) {
    const graphics = {
        style: 'Minimal — relies on photography and typography',
        elements: []
    };

    // Detect badge/pill patterns
    const allCSS = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');
    const hasPills = /border-radius\s*:\s*(1[5-9]|[2-9]\d|1\d{2})px/g.test(allCSS);
    if (hasPills) {
        graphics.elements.push({
            name: 'Pill/Badge Elements',
            description: 'Rounded pill-shaped badges or filter elements detected'
        });
    }

    // Detect accent rules / decorative borders
    const accentBorderRegex = /border-(?:top|bottom|left)\s*:\s*(\d+)px\s+solid\s+(#[0-9a-fA-F]{3,8})/g;
    let match;
    while ((match = accentBorderRegex.exec(allCSS)) !== null) {
        const width = parseInt(match[1]);
        if (width >= 2 && width <= 6) {
            const hex = normalizeHex(match[2]);
            if (hex && !isGrayscale(hex) && !isNearBlackOrWhite(hex)) {
                graphics.elements.push({
                    name: 'Accent Rule/Border',
                    description: `Decorative ${width}px accent border`,
                    color: hex
                });
                break;
            }
        }
    }

    // Detect breaking news / live indicators from content
    const bodyText = doc.body ? doc.body.textContent.toLowerCase() : '';
    if (bodyText.includes('breaking') || bodyText.includes('eilmeldung')) {
        graphics.elements.push({
            name: 'Breaking News Indicator',
            description: 'Breaking news banner or badge pattern detected'
        });
    }
    if (bodyText.includes('live') || bodyText.includes('liveticker')) {
        graphics.elements.push({
            name: 'Live Indicator',
            description: 'Live content badge or ticker detected'
        });
    }

    // Detect separator patterns
    const hrCount = doc.querySelectorAll('hr').length;
    const separatorClasses = doc.querySelectorAll('[class*="separator"], [class*="divider"]').length;
    if (hrCount + separatorClasses > 2) {
        graphics.elements.push({
            name: 'Content Separators',
            description: 'Horizontal rule or divider elements for content separation'
        });
    }

    // Update style description based on findings
    if (graphics.elements.length > 3) {
        graphics.style = 'Rich visual language with badges, accent rules, and decorative elements';
    } else if (graphics.elements.length > 0) {
        graphics.style = 'Moderate use of visual elements — badges and accent rules alongside typography';
    }

    return graphics;
}

// ============================================================
//  9. NAVIGATION EXTRACTION (New)
// ============================================================
function extractNavigation(doc) {
    const navigation = {
        nav_links: [],
        footer_links: [],
        social_links: []
    };

    // Top navigation links
    const navEl = doc.querySelector('nav') || doc.querySelector('[class*="nav"]:not(footer *)') || doc.querySelector('[role="navigation"]');
    if (navEl) {
        navEl.querySelectorAll('a').forEach(a => {
            const text = a.textContent.trim();
            const href = a.getAttribute('href');
            if (text && text.length < 40 && href && !text.includes('\n')) {
                navigation.nav_links.push({ text, href });
            }
        });
        // Limit to top-level nav items (first 15)
        navigation.nav_links = navigation.nav_links.slice(0, 15);
    }

    // Footer links grouped by section
    const footer = doc.querySelector('footer') || doc.querySelector('[class*="footer"]');
    if (footer) {
        const sections = footer.querySelectorAll('div > ul, [class*="column"], [class*="group"]');
        sections.forEach(section => {
            const heading = section.previousElementSibling;
            const headingText = heading ? heading.textContent.trim() : '';
            const links = [];
            section.querySelectorAll('a').forEach(a => {
                const text = a.textContent.trim();
                if (text && text.length < 60) links.push(text);
            });
            if (links.length > 0) {
                navigation.footer_links.push({
                    heading: headingText || 'Links',
                    links: links.slice(0, 10)
                });
            }
        });
    }

    // Social links (from anywhere)
    const socialPatterns = [
        { pattern: /facebook\.com|fb\.com/i, name: 'Facebook' },
        { pattern: /twitter\.com|x\.com/i, name: 'X (Twitter)' },
        { pattern: /instagram\.com/i, name: 'Instagram' },
        { pattern: /youtube\.com/i, name: 'YouTube' },
        { pattern: /linkedin\.com/i, name: 'LinkedIn' },
        { pattern: /tiktok\.com/i, name: 'TikTok' },
    ];
    doc.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        for (const { pattern, name } of socialPatterns) {
            if (pattern.test(href) && !navigation.social_links.includes(name)) {
                navigation.social_links.push(name);
            }
        }
    });

    return navigation;
}
