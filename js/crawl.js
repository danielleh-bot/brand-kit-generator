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
            // Fallback: Let user paste HTML
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

        statusBar.className = 'status-bar success';
        statusText.textContent = 'Crawl complete! Brand kit generated with ' + Object.keys(brandKit).length + ' tokens.';
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

    // BUILD BRAND KIT
    addLog('Assembling brand kit JSON...', 'info');
    const domain = new URL(pubUrl).hostname.replace('www.','');

    brandKit = {
        "meta.publisher": pubName,
        "meta.domain": domain,
        "meta.crawled_url": pubUrl,
        "meta.article_url": artUrl || null,
        "meta.generated_at": new Date().toISOString(),
        "meta.tool_version": "1.0.0",
        ...colors,
        ...fonts,
        ...layout,
        ...brand
    };

    addLog('Brand kit assembled with ' + Object.keys(brandKit).length + ' tokens', 'success');
}

// ============================================================
//  CRAWL RESULTS DISPLAY
// ============================================================
function renderCrawlResults() {
    // Stats
    const colorCount = Object.keys(brandKit).filter(k => k.startsWith('colors.')).length;
    const fontCount = Object.keys(brandKit).filter(k => k.startsWith('fonts.')).length;
    const layoutCount = Object.keys(brandKit).filter(k => k.startsWith('layout.') || k.startsWith('photo_style.')).length;
    const totalCount = Object.keys(brandKit).length;

    document.getElementById('crawlStats').innerHTML = `
        <div class="stat-card"><div class="stat-value accent">${totalCount}</div><div class="stat-label">Total Tokens</div></div>
        <div class="stat-card"><div class="stat-value green">${colorCount}</div><div class="stat-label">Color Tokens</div></div>
        <div class="stat-card"><div class="stat-value green">${fontCount}</div><div class="stat-label">Font Tokens</div></div>
        <div class="stat-card"><div class="stat-value green">${layoutCount}</div><div class="stat-label">Layout Tokens</div></div>
    `;

    // Color swatches
    const swatchContainer = document.getElementById('colorSwatches');
    swatchContainer.innerHTML = '';
    Object.entries(brandKit).forEach(([key, val]) => {
        if (key.startsWith('colors.') && typeof val === 'string' && val.startsWith('#')) {
            const name = key.replace('colors.', '').replace(/\./g, ' ');
            swatchContainer.innerHTML += `
                <div class="swatch">
                    <div class="swatch-color" style="background:${val}"></div>
                    <div class="swatch-info">
                        <div class="swatch-name">${name}</div>
                        <div class="swatch-hex">${val}</div>
                    </div>
                </div>
            `;
        }
    });

    // Font previews
    const fontContainer = document.getElementById('fontPreviews');
    fontContainer.innerHTML = '';
    const primaryFont = brandKit["fonts.primary.family"] || 'sans-serif';
    const secondaryFont = brandKit["fonts.secondary.family"];

    fontContainer.innerHTML = `
        <div class="font-preview-item">
            <div class="font-preview-sample" style="font-family:'${primaryFont}',sans-serif;">The quick brown fox jumps</div>
            <div class="font-preview-meta"><strong>${primaryFont}</strong><br>Primary Font</div>
        </div>
    `;
    if (secondaryFont) {
        fontContainer.innerHTML += `
            <div class="font-preview-item">
                <div class="font-preview-sample" style="font-family:'${secondaryFont}',serif;font-style:italic;">The quick brown fox jumps</div>
                <div class="font-preview-meta"><strong>${secondaryFont}</strong><br>Secondary Font</div>
            </div>
        `;
    }
}
