// ============================================================
//  STEP 1: CRAWL
// ============================================================
const CORS_PROXIES = [
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

async function fetchWithProxy(url) {
    for (const proxy of CORS_PROXIES) {
        try {
            const resp = await fetch(proxy(url), { signal: AbortSignal.timeout(15000) });
            if (resp.ok) return await resp.text();
        } catch(e) { /* try next */ }
    }
    return null;
}

function addLog(msg, type = '') {
    const log = document.getElementById('crawlLog');
    const ts = new Date().toLocaleTimeString();
    log.innerHTML += `<div class="log-line ${type}">[${ts}] ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}

/**
 * Convert flat dot-notation extractor output into the rich nested brand kit JSON
 * that matches the CLI's schema (brand, logos, colors, fonts, brand_voice, etc.)
 */
function restructureBrandKit(flatColors, flatFonts, flatLayout, flatBrand, pubName, pubUrl, artUrl) {
    const domain = new URL(pubUrl).hostname.replace('www.', '');

    // Helper to safely get flat values
    const g = (key) => {
        if (flatColors[key] !== undefined) return flatColors[key];
        if (flatFonts[key] !== undefined) return flatFonts[key];
        if (flatLayout[key] !== undefined) return flatLayout[key];
        if (flatBrand[key] !== undefined) return flatBrand[key];
        return undefined;
    };

    const primaryHex = g('colors.primary.hex') || g('brand.theme_color') || '#2196F3';
    const secondaryHex = g('colors.secondary.hex');
    const textPrimHex = g('colors.text.primary.hex') || '#1A1A2E';
    const textSecHex = g('colors.text.secondary.hex') || '#4A4A5A';
    const textTertHex = g('colors.text.tertiary.hex') || '#8A8A9A';
    const bgPageHex = g('colors.backgrounds.page.hex') || '#FFFFFF';
    const bgSectionHex = g('colors.backgrounds.section.hex') || '#F7F9FC';
    const bgSecondaryHex = g('colors.backgrounds.secondary.hex') || '#EBEFF7';
    const borderHex = g('colors.borders.primary.hex') || '#E0E0E0';

    const primaryFamily = g('fonts.primary.family') || 'sans-serif';
    const primaryFallbacks = g('fonts.primary.fallbacks') || ['sans-serif'];
    const secondaryFamily = g('fonts.secondary.family');
    const secondaryStyle = g('fonts.secondary.style');

    const typeScale = {};
    const scaleKeys = ['headline_large', 'article_title_card', 'section_headings', 'body_text', 'meta_text'];
    for (const sk of scaleKeys) {
        const val = g(`fonts.type_scale.${sk}`);
        if (val) {
            // Map flat key names to CLI schema names
            const mappedName = {
                'headline_large': 'article_title_hero',
                'article_title_card': 'article_title_card',
                'section_headings': 'section_headings',
                'body_text': 'article_body',
                'meta_text': 'meta_text'
            }[sk] || sk;
            typeScale[mappedName] = {
                family: primaryFamily,
                size: val.size,
                weight: val.weight,
                lineHeight: val.line_height || val.lineHeight
            };
        }
    }

    // Build content labels from brand signals
    const contentLabels = {};
    const labelPatterns = ['opinion', 'meinung', 'kommentar', 'editorial', 'analysis', 'live', 'breaking', 'eilmeldung', 'video', 'gallery'];
    for (const label of labelPatterns) {
        if (g(`brand_voice.content_labels.${label}`)) {
            contentLabels[label] = true;
        }
    }

    // Detect language from doc if available
    const lang = g('brand_voice.language') || 'en';

    return {
        brand: {
            name: pubName,
            tagline: g('brand.site_name') || pubName,
            website: `https://${domain}`,
            description: `Brand kit for ${pubName}`,
            language: lang
        },
        logos: {
            primary: {
                type: 'text',
                text: g('brand.site_name') || pubName
            },
            favicon_url: g('logos.favicon.url') || null,
            variants: []
        },
        colors: {
            primary: {
                name: 'Brand Primary',
                hex: primaryHex,
                rgb: hexToRgbString(primaryHex),
                usage: ['links', 'buttons', 'accent elements']
            },
            secondary: secondaryHex ? {
                name: 'Brand Secondary',
                hex: secondaryHex,
                rgb: hexToRgbString(secondaryHex),
                usage: ['secondary accents']
            } : null,
            text: {
                primary: { hex: textPrimHex, usage: 'Headlines, body text' },
                secondary: { hex: textSecHex, usage: 'Subheadings, metadata' },
                tertiary: { hex: textTertHex, usage: 'Captions, timestamps' }
            },
            backgrounds: {
                base: { hex: bgPageHex, usage: 'Page background' },
                section: { hex: bgSectionHex, usage: 'Section backgrounds, card fills' },
                secondary: { hex: bgSecondaryHex, usage: 'Hover states, secondary fills' },
                dark: { hex: '#1a1a1a', usage: 'Footer, dark sections' }
            },
            borders: {
                primary: { hex: borderHex }
            },
            accents: {}
        },
        fonts: {
            primary: {
                family: primaryFamily,
                fallbacks: Array.isArray(primaryFallbacks) ? primaryFallbacks.join(', ') : primaryFallbacks,
                weights: { regular: 400, bold: 700 },
                usage: 'Headlines, navigation'
            },
            secondary: secondaryFamily ? {
                family: secondaryFamily,
                weight: 400,
                style: secondaryStyle || 'normal',
                usage: 'Body text, opinion content'
            } : null,
            type_scale: typeScale
        },
        brand_voice: {
            language: lang,
            headline_style: {
                capitalization: 'sentence_case',
                avg_word_count: 8
            },
            content_labels: contentLabels,
            content_distinction: {}
        },
        photo_style: {
            thumbnail_format: {
                aspect_ratio: g('photo_style.thumbnail_format.aspect_ratio') || '16:9',
                border_radius: g('photo_style.thumbnail_format.border_radius') || '0px'
            },
            video_thumbnails: {
                indicator: g('photo_style.video_thumbnails.has_video_content') ? 'play_button' : 'none',
                indicator_color: primaryHex
            },
            author_photos: { shape: 'circle', size: '40px' }
        },
        graphics: {
            style: 'minimal',
            elements: []
        },
        icons: {
            style: 'line',
            count_detected: 0,
            social_media_icons: {}
        },
        layout_patterns: {
            grid: g('layout.grid.gap') ? { gap: g('layout.grid.gap') } : {},
            container: { max_width: g('layout.container.max_width') || '1200px' },
            card: { border_radius: g('layout.card.border_radius') || '0px' },
            spacing: {
                xs: g('layout.spacing.xs') || '4px',
                sm: g('layout.spacing.sm') || '8px',
                md: g('layout.spacing.md') || '16px',
                lg: g('layout.spacing.lg') || '24px',
                xl: g('layout.spacing.xl') || '48px'
            }
        },
        metadata: {
            analysis_date: new Date().toISOString().split('T')[0],
            source_url: pubUrl,
            article_url: artUrl || null,
            analysis_method: 'browser-cors-proxy',
            tool_version: '2.0.0'
        }
    };
}

/** Convert hex to "r,g,b" string */
function hexToRgbString(hex) {
    if (!hex || !hex.startsWith('#')) return '0,0,0';
    const h = hex.replace('#', '');
    return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

async function startCrawl() {
    const pubUrl = document.getElementById('publisherUrl').value.trim();
    const artUrl = document.getElementById('articleUrl').value.trim();
    const pubName = document.getElementById('publisherName').value.trim();

    if (!pubUrl) { alert('Please enter a publisher URL'); return; }
    if (!pubName) { alert('Please enter a publisher name'); return; }

    document.getElementById('crawlStatus').classList.remove('hidden');
    document.getElementById('crawlResults').classList.add('hidden');
    document.getElementById('crawlLog').innerHTML = '';
    document.getElementById('crawlBtn').disabled = true;

    const statusBar = document.getElementById('crawlStatusBar');
    const statusText = document.getElementById('crawlStatusText');
    statusBar.className = 'status-bar running';

    try {
        // STEP 1: Fetch homepage
        addLog('Fetching publisher homepage: ' + pubUrl, 'info');
        statusText.textContent = 'Fetching publisher homepage...';
        const homeHtml = await fetchWithProxy(pubUrl);

        let artHtml = null;
        if (artUrl) {
            addLog('Fetching article page: ' + artUrl, 'info');
            statusText.textContent = 'Fetching article page...';
            artHtml = await fetchWithProxy(artUrl);
        }

        if (!homeHtml) {
            addLog('Could not fetch URL directly (CORS). Switching to manual mode.', 'warn');
            addLog('A dialog will open — paste the page source HTML.', 'warn');
            statusText.textContent = 'Waiting for manual HTML input...';
            const manualHtml = prompt(
                'The crawler could not fetch the URL directly due to CORS restrictions.\n\n' +
                'To proceed, please:\n' +
                '1. Open ' + pubUrl + ' in your browser\n' +
                '2. Right-click → View Page Source (or Ctrl+U)\n' +
                '3. Select All (Ctrl+A) and Copy (Ctrl+C)\n' +
                '4. Paste the HTML below:'
            );
            if (!manualHtml) {
                addLog('Crawl cancelled by user.', 'error');
                statusBar.className = 'status-bar error';
                statusText.textContent = 'Crawl cancelled';
                document.getElementById('crawlBtn').disabled = false;
                return;
            }
            addLog('Received manual HTML input (' + manualHtml.length + ' chars)', 'success');
            await analyzePage(manualHtml, artHtml, pubUrl, artUrl, pubName);
        } else {
            addLog('Homepage fetched successfully (' + homeHtml.length + ' chars)', 'success');
            if (artHtml) addLog('Article page fetched (' + artHtml.length + ' chars)', 'success');
            await analyzePage(homeHtml, artHtml, pubUrl, artUrl, pubName);
        }

        const tokenCount = countNestedKeys(brandKit);
        statusBar.className = 'status-bar success';
        statusText.textContent = `Crawl complete! Brand kit generated with ${tokenCount} tokens.`;
        document.getElementById('crawlResults').classList.remove('hidden');
        renderCrawlResults();
        addLog('Brand kit generation complete!', 'success');

    } catch(err) {
        addLog('Error: ' + err.message, 'error');
        statusBar.className = 'status-bar error';
        statusText.textContent = 'Crawl failed: ' + err.message;
    }

    document.getElementById('crawlBtn').disabled = false;
}

/** Count leaf keys in a nested object */
function countNestedKeys(obj, prefix) {
    if (!obj) return 0;
    let count = 0;
    for (const [key, val] of Object.entries(obj)) {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            count += countNestedKeys(val);
        } else {
            count++;
        }
    }
    return count;
}

async function analyzePage(html, artHtml, pubUrl, artUrl, pubName) {
    addLog('Parsing DOM structure...', 'info');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let artDoc = null;
    if (artHtml) {
        artDoc = parser.parseFromString(artHtml, 'text/html');
    }

    // EXTRACT COLORS
    addLog('Extracting color palette...', 'info');
    const colors = extractColors(doc);
    addLog(`Found ${Object.keys(colors).length} color tokens`, 'success');

    // EXTRACT FONTS
    addLog('Analyzing typography...', 'info');
    const fonts = extractFonts(doc, html);
    addLog(`Found ${Object.keys(fonts).length} font tokens`, 'success');

    // EXTRACT LAYOUT
    addLog('Analyzing layout patterns...', 'info');
    const layout = extractLayout(doc);
    addLog(`Found ${Object.keys(layout).length} layout tokens`, 'success');

    // EXTRACT ARTICLE DATA
    if (artDoc) {
        addLog('Extracting article content...', 'info');
        articleData = extractArticleData(artDoc, artUrl);
        addLog('Article content extracted: "' + (articleData.title || 'Untitled').substring(0, 60) + '..."', 'success');
    }

    // EXTRACT BRAND SIGNALS
    addLog('Detecting brand signals (logos, motifs, labels)...', 'info');
    const brand = extractBrandSignals(doc, html, pubUrl);
    addLog(`Found ${Object.keys(brand).length} brand signal tokens`, 'success');

    // Detect language
    const langAttr = doc.documentElement.getAttribute('lang');
    if (langAttr) brand['brand_voice.language'] = langAttr;

    // EXTRACT HOMEPAGE CARDS (real headlines + images from publisher)
    addLog('Extracting homepage article cards...', 'info');
    homepageCards = extractHomepageCards(doc, pubUrl);
    addLog(`Found ${homepageCards.length} article cards with images`, 'success');

    // EXTRACT PAGE IMAGES (for sponsored card thumbnails)
    addLog('Extracting page images...', 'info');
    pageImages = extractPageImages(doc, pubUrl);
    addLog(`Found ${pageImages.length} content images`, 'success');

    // DETECT PAGE DIRECTION
    pageDirection = extractPageDirection(doc);
    if (pageDirection === 'rtl') {
        addLog('Detected RTL layout (right-to-left language)', 'info');
    }

    // BUILD NESTED BRAND KIT
    addLog('Assembling rich nested brand kit JSON...', 'info');
    brandKit = restructureBrandKit(colors, fonts, layout, brand, pubName, pubUrl, artUrl);

    // Add direction to brand kit
    brandKit.layout_patterns.direction = pageDirection;

    // Build navigation from doc
    navigationData = extractNavigationFromDoc(doc, pubUrl);

    addLog('Brand kit assembled with ' + countNestedKeys(brandKit) + ' tokens', 'success');
}

/**
 * Extract navigation links from the HTML document (for browser-based tool)
 */
function extractNavigationFromDoc(doc, pubUrl) {
    const navLinks = [];
    const nav = doc.querySelector('nav') || doc.querySelector('header');
    if (nav) {
        nav.querySelectorAll('a').forEach(a => {
            const text = a.textContent.trim();
            if (text && text.length < 30 && text.length > 1) {
                navLinks.push({ text, href: a.getAttribute('href') || '#' });
            }
        });
    }

    const footerLinks = [];
    const footer = doc.querySelector('footer');
    if (footer) {
        const groups = footer.querySelectorAll('ul, div > div');
        groups.forEach(group => {
            const links = [];
            group.querySelectorAll('a').forEach(a => {
                const text = a.textContent.trim();
                if (text && text.length < 40) links.push({ text });
            });
            if (links.length > 0) {
                footerLinks.push({ group: links[0].text, links: links.slice(1) });
            }
        });
    }

    const socialLinks = [];
    const socialPlatforms = ['facebook', 'twitter', 'instagram', 'youtube', 'linkedin', 'tiktok'];
    doc.querySelectorAll('a[href]').forEach(a => {
        const href = (a.getAttribute('href') || '').toLowerCase();
        for (const platform of socialPlatforms) {
            if (href.includes(platform)) {
                socialLinks.push({ platform, url: a.getAttribute('href') });
                break;
            }
        }
    });

    return { navLinks: navLinks.slice(0, 12), footerLinks: footerLinks.slice(0, 6), socialLinks: [...new Map(socialLinks.map(s => [s.platform, s])).values()] };
}

// ============================================================
//  CRAWL RESULTS DISPLAY
// ============================================================
function renderCrawlResults() {
    const kit = brandKit;

    // Count tokens per category
    const colorCount = countNestedKeys(kit.colors);
    const fontCount = countNestedKeys(kit.fonts);
    const layoutCount = countNestedKeys(kit.layout_patterns) + countNestedKeys(kit.photo_style);
    const totalCount = countNestedKeys(kit);

    document.getElementById('crawlStats').innerHTML = `
        <div class="stat-card"><div class="stat-value accent">${totalCount}</div><div class="stat-label">Total Tokens</div></div>
        <div class="stat-card"><div class="stat-value green">${colorCount}</div><div class="stat-label">Color Tokens</div></div>
        <div class="stat-card"><div class="stat-value green">${fontCount}</div><div class="stat-label">Font Tokens</div></div>
        <div class="stat-card"><div class="stat-value green">${layoutCount}</div><div class="stat-label">Layout Tokens</div></div>
    `;

    // Color swatches from nested structure
    const swatchContainer = document.getElementById('colorSwatches');
    swatchContainer.innerHTML = '';
    const colorEntries = [
        ['Primary', kit.colors.primary?.hex],
        ['Secondary', kit.colors.secondary?.hex],
        ['Text Primary', kit.colors.text?.primary?.hex],
        ['Text Secondary', kit.colors.text?.secondary?.hex],
        ['Text Tertiary', kit.colors.text?.tertiary?.hex],
        ['Background Base', kit.colors.backgrounds?.base?.hex],
        ['Background Section', kit.colors.backgrounds?.section?.hex],
        ['Background Secondary', kit.colors.backgrounds?.secondary?.hex],
        ['Background Dark', kit.colors.backgrounds?.dark?.hex],
        ['Border Primary', kit.colors.borders?.primary?.hex],
    ];
    for (const [name, hex] of colorEntries) {
        if (hex) {
            swatchContainer.innerHTML += `
                <div class="swatch">
                    <div class="swatch-color" style="background:${hex}"></div>
                    <div class="swatch-info">
                        <div class="swatch-name">${name}</div>
                        <div class="swatch-hex">${hex}</div>
                    </div>
                </div>
            `;
        }
    }

    // Font previews
    const fontContainer = document.getElementById('fontPreviews');
    fontContainer.innerHTML = '';
    const primaryFont = kit.fonts.primary?.family || 'sans-serif';
    const secondaryFont = kit.fonts.secondary?.family;

    // Resolve to Google Fonts
    const resolved = resolveGoogleFont(primaryFont);
    const displayFont = resolved ? resolved.google : primaryFont;

    fontContainer.innerHTML = `
        <div class="font-preview-item">
            <div class="font-preview-sample" style="font-family:'${displayFont}','${primaryFont}',sans-serif;">The quick brown fox jumps</div>
            <div class="font-preview-meta"><strong>${primaryFont}</strong>${resolved ? ` → ${resolved.google}` : ''}<br>Primary Font</div>
        </div>
    `;
    if (secondaryFont) {
        const resolved2 = resolveGoogleFont(secondaryFont);
        const displayFont2 = resolved2 ? resolved2.google : secondaryFont;
        fontContainer.innerHTML += `
            <div class="font-preview-item">
                <div class="font-preview-sample" style="font-family:'${displayFont2}','${secondaryFont}',serif;font-style:italic;">The quick brown fox jumps</div>
                <div class="font-preview-meta"><strong>${secondaryFont}</strong>${resolved2 ? ` → ${resolved2.google}` : ''}<br>Secondary Font</div>
            </div>
        `;
    }
}
