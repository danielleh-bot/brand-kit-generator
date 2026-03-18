// ============================================================
//  STEP 1: CRAWL — Assembles rich nested brand kit JSON
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

        // Count tokens for status display
        const tokenCount = countTokens(brandKit);
        statusBar.className = 'status-bar success';
        statusText.textContent = `Crawl complete! Brand kit generated with ${tokenCount} tokens across ${Object.keys(brandKit).length} sections.`;
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

// Count total leaf values in nested object
function countTokens(obj) {
    let count = 0;
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val === null || val === undefined) continue;
        if (typeof val === 'object' && !Array.isArray(val)) count += countTokens(val);
        else count++;
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

    const domain = new URL(pubUrl).hostname.replace('www.', '');

    // ---- EXTRACT ALL SIGNALS ----

    // Colors
    addLog('Extracting color palette with usage analysis...', 'info');
    const colors = extractColors(doc);
    addLog(`Found ${Object.keys(colors).length} color categories with accent detection`, 'success');

    // Fonts
    addLog('Analyzing typography and type scale...', 'info');
    const fonts = extractFonts(doc, html);
    addLog(`Found fonts: ${fonts.primary.family}${fonts.secondary ? ', ' + fonts.secondary.family : ''} with ${Object.keys(fonts.type_scale).length}-category type scale`, 'success');

    // Layout
    addLog('Analyzing layout patterns, header/footer structure...', 'info');
    const layout = extractLayout(doc);
    addLog(`Layout: ${layout.layout_patterns.grid}, ${layout.layout_patterns.header.layers.length} header layers`, 'success');

    // Brand signals
    addLog('Detecting brand signals (logos, motifs, labels)...', 'info');
    const brand = extractBrandSignals(doc, html, pubUrl);
    addLog(`Brand signals: ${brand.siteName || pubName}, language: ${brand.language}, ${Object.keys(brand.contentLabels || {}).length} content labels`, 'success');

    // Brand voice
    addLog('Analyzing brand voice and editorial patterns...', 'info');
    const voice = extractBrandVoice(doc, html);
    addLog(`Voice: ${voice.personality_traits?.join(', ') || 'Standard'}, ${voice.headline_style?.case || 'standard case'}`, 'success');

    // Icons
    addLog('Inventorying icon set and social links...', 'info');
    const icons = extractIcons(doc);
    addLog(`Icons: ${icons.count_detected} detected, ${icons.icon_inventory.length} types identified, ${icons.social_media_icons?.platforms?.length || 0} social platforms`, 'success');

    // Graphics
    addLog('Detecting graphic elements and visual patterns...', 'info');
    const graphics = extractGraphics(doc, html);
    addLog(`Graphics: ${graphics.elements.length} visual elements detected`, 'success');

    // Navigation
    addLog('Extracting navigation structure...', 'info');
    const navigation = extractNavigation(doc);
    addLog(`Navigation: ${navigation.nav_links.length} nav links, ${navigation.footer_links.length} footer sections, ${navigation.social_links.length} social links`, 'success');

    // Article data
    if (artDoc) {
        addLog('Extracting article content...', 'info');
        articleData = extractArticleData(artDoc, artUrl);
        addLog('Article: "' + (articleData.title || 'Untitled').substring(0, 60) + '..."', 'success');
    }

    // ---- ASSEMBLE NESTED BRAND KIT ----
    addLog('Assembling rich brand kit JSON...', 'info');

    // Apply theme-color override to primary if available
    if (brand.themeColor) {
        const tc = normalizeHex(brand.themeColor);
        if (tc && !isGrayscale(tc) && !isNearBlackOrWhite(tc)) {
            colors.primary = {
                name: colorName(tc),
                hex: tc,
                rgb: hexToRgbString(tc),
                usage: colors.primary.usage
            };
        }
    }

    // Set video content flag from brand signals
    if (brand.hasVideoContent) {
        layout.photo_style.video_thumbnails.has_video_content = true;
    }

    brandKit = {
        brand: {
            name: pubName,
            website: pubUrl,
            owner: brand.owner || null,
            description: brand.description || `News and information portal at ${domain}.`,
            language: brand.language || 'en'
        },
        logos: {
            primary: {
                type: brand.logoSvg ? 'svg' : (brand.logoUrl ? 'image' : 'text'),
                url: brand.logoUrl || null,
                svg: brand.logoSvg || null,
                description: `${pubName} logo`
            },
            favicon: {
                url: brand.faviconUrl || null
            }
        },
        colors: colors,
        fonts: fonts,
        brand_voice: {
            personality_traits: voice.personality_traits || ['Authoritative', 'Direct', 'Accessible'],
            tone: voice.content_distinction ? 'Serious journalism with an approachable touch' : 'Professional and informative',
            headline_style: voice.headline_style || {
                format: 'Concise, factual',
                case: 'Sentence case'
            },
            content_distinction: voice.content_distinction || null,
            content_labels: brand.contentLabels || {},
            language: voice.language || brand.language || 'en'
        },
        photo_style: {
            news_photography: {
                style: 'Editorial/press agency',
                characteristics: ['Candid, in-action shots', 'Tight cropping for impact', 'Large scale for hero stories']
            },
            thumbnail_format: layout.photo_style.thumbnail_format,
            video_thumbnails: {
                has_video_content: layout.photo_style.video_thumbnails.has_video_content,
                indicator_color: colors.primary.hex
            }
        },
        graphics: graphics,
        icons: icons,
        layout_patterns: layout.layout_patterns,
        layout: {
            card: layout.card,
            container: layout.container,
            grid: layout.grid,
            spacing: layout.spacing
        },
        navigation: navigation,
        metadata: {
            analysis_date: new Date().toISOString().split('T')[0],
            source_url: pubUrl,
            article_url: artUrl || null,
            analysis_method: 'Automated web crawling with CSS extraction and visual analysis',
            tool_version: '2.0.0',
            total_tokens: 0 // will be set below
        }
    };

    // Count and set total tokens
    brandKit.metadata.total_tokens = countTokens(brandKit);

    addLog(`Brand kit assembled: ${brandKit.metadata.total_tokens} tokens across ${Object.keys(brandKit).length} top-level sections`, 'success');
}

// ============================================================
//  CRAWL RESULTS DISPLAY (updated for nested structure)
// ============================================================
function renderCrawlResults() {
    const colorCount = countTokens(brandKit.colors || {});
    const fontCount = countTokens(brandKit.fonts || {});
    const layoutCount = countTokens(brandKit.layout || {}) + countTokens(brandKit.layout_patterns || {});
    const brandCount = countTokens(brandKit.brand || {}) + countTokens(brandKit.brand_voice || {}) + countTokens(brandKit.logos || {});
    const totalCount = brandKit.metadata?.total_tokens || countTokens(brandKit);

    document.getElementById('crawlStats').innerHTML = `
        <div class="stat-card"><div class="stat-value accent">${totalCount}</div><div class="stat-label">Total Tokens</div></div>
        <div class="stat-card"><div class="stat-value green">${colorCount}</div><div class="stat-label">Color Tokens</div></div>
        <div class="stat-card"><div class="stat-value green">${fontCount}</div><div class="stat-label">Font Tokens</div></div>
        <div class="stat-card"><div class="stat-value green">${layoutCount}</div><div class="stat-label">Layout Tokens</div></div>
    `;

    // Color swatches
    const swatchContainer = document.getElementById('colorSwatches');
    swatchContainer.innerHTML = '';

    function renderSwatch(label, entry) {
        if (!entry || !entry.hex) return;
        swatchContainer.innerHTML += `
            <div class="swatch">
                <div class="swatch-color" style="background:${entry.hex}"></div>
                <div class="swatch-info">
                    <div class="swatch-name">${label}</div>
                    <div class="swatch-hex">${entry.hex}</div>
                </div>
            </div>
        `;
    }

    const c = brandKit.colors;
    if (c) {
        renderSwatch('Primary', c.primary);
        if (c.secondary) renderSwatch('Secondary', c.secondary);
        if (c.tertiary) renderSwatch('Tertiary', c.tertiary);
        if (c.text?.primary) renderSwatch('Text Primary', c.text.primary);
        if (c.text?.secondary) renderSwatch('Text Secondary', c.text.secondary);
        if (c.text?.tertiary) renderSwatch('Text Tertiary', c.text.tertiary);
        if (c.backgrounds?.base) renderSwatch('BG Base', c.backgrounds.base);
        if (c.backgrounds?.section) renderSwatch('BG Section', c.backgrounds.section);
        if (c.backgrounds?.dark) renderSwatch('BG Dark', c.backgrounds.dark);
        if (c.accents) {
            for (const [key, val] of Object.entries(c.accents)) {
                renderSwatch(val.name || key, val);
            }
        }
    }

    // Font previews
    const fontContainer = document.getElementById('fontPreviews');
    fontContainer.innerHTML = '';
    const f = brandKit.fonts;
    if (f?.primary) {
        fontContainer.innerHTML += `
            <div class="font-preview-item">
                <div class="font-preview-sample" style="font-family:'${f.primary.family}',sans-serif;">The quick brown fox jumps</div>
                <div class="font-preview-meta"><strong>${f.primary.family}</strong><br>Primary Font — ${f.primary.usage || 'Headlines and body'}</div>
            </div>
        `;
    }
    if (f?.secondary) {
        fontContainer.innerHTML += `
            <div class="font-preview-item">
                <div class="font-preview-sample" style="font-family:'${f.secondary.family}',serif;${f.secondary.style === 'italic' ? 'font-style:italic;' : ''}"">The quick brown fox jumps</div>
                <div class="font-preview-meta"><strong>${f.secondary.family}</strong><br>Secondary Font — ${f.secondary.usage || 'Editorial content'}</div>
            </div>
        `;
    }
}
