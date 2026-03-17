// ============================================================
//  STEP 3: PROTOTYPE GENERATOR
// ============================================================
function generatePrototype() {
    if (!brandKit) return;

    const pub = brandKit["meta.publisher"] || 'Publisher';
    const domain = brandKit["meta.domain"] || 'publisher.com';
    const primary = brandKit["colors.primary.hex"] || '#2196F3';
    const textPrimary = brandKit["colors.text.primary.hex"] || '#1A1A2E';
    const textSecondary = brandKit["colors.text.secondary.hex"] || '#4A4A5A';
    const textTertiary = brandKit["colors.text.tertiary.hex"] || '#8A8A9A';
    const bgPage = brandKit["colors.backgrounds.page.hex"] || '#FFFFFF';
    const bgSection = brandKit["colors.backgrounds.section.hex"] || '#F7F9FC';
    const bgSecondary = brandKit["colors.backgrounds.secondary.hex"] || '#EBEFF7';
    const borderColor = brandKit["colors.borders.primary.hex"] || '#E0E0E0';
    const fontPrimary = brandKit["fonts.primary.family"] || 'sans-serif';
    const fontSecondary = brandKit["fonts.secondary.family"] || fontPrimary;
    const borderRadius = brandKit["layout.card.border_radius"] || '0px';
    const gridGap = brandKit["layout.grid.gap"] || '24px';
    const containerWidth = brandKit["layout.container.max_width"] || '1200px';
    const titleScale = brandKit["fonts.type_scale.article_title_card"] || { size: '22px', weight: 700, line_height: '26px' };
    const headlineScale = brandKit["fonts.type_scale.headline_large"] || { size: '34px', weight: 700 };
    const bodyScale = brandKit["fonts.type_scale.body_text"] || { size: '16px', weight: 400, line_height: '26px' };
    const metaScale = brandKit["fonts.type_scale.meta_text"] || { size: '13px', weight: 400 };

    // Article data
    const art = articleData || {
        title: 'Breaking News: Major Developments Unfold Across the Region',
        kicker: 'TOP STORY',
        author: 'Staff Writer',
        date: new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }),
        heroImage: '',
        lead: 'In a significant turn of events, developments continue to unfold that could reshape the landscape of the industry for years to come.',
        paragraphs: [
            'The implications of these changes are far-reaching, affecting millions of people across the country and beyond. Experts weigh in on what this means for the future.',
            'According to leading analysts, the shift represents one of the most significant transformations in the sector in decades. Industry leaders are scrambling to adapt their strategies.',
            '"This is a watershed moment," said one prominent industry figure who spoke on condition of anonymity. "The old ways of doing things are simply no longer viable."',
            'Government officials have indicated they are closely monitoring the situation and may introduce new regulatory frameworks in response to the changing dynamics.'
        ]
    };

    const heroPlaceholder = art.heroImage
        ? `<img src="${art.heroImage}" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;" crossorigin="anonymous" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div style="display:none;width:100%;aspect-ratio:16/9;background:${bgSection};align-items:center;justify-content:center;"><svg width="64" height="64" fill="none" stroke="${textTertiary}" stroke-width="1.5" opacity="0.4"><rect x="12" y="12" width="40" height="40" rx="4"/><circle cx="24" cy="24" r="5"/><path d="M12 44l14-14 8 8 10-10 8 8"/></svg></div>`
        : `<div style="width:100%;aspect-ratio:16/9;background:${bgSection};display:flex;align-items:center;justify-content:center;"><svg width="64" height="64" fill="none" stroke="${textTertiary}" stroke-width="1.5" opacity="0.4"><rect x="12" y="12" width="40" height="40" rx="4"/><circle cx="24" cy="24" r="5"/><path d="M12 44l14-14 8 8 10-10 8 8"/></svg></div>`;

    // Generate sample feed cards
    const sampleCards = [
        { cat: 'Politics', title: 'Government Announces New Infrastructure Plan Worth Billions', source: pub },
        { cat: 'Business', title: 'Tech Giants Report Record Quarterly Earnings Amid AI Boom', source: pub },
        { cat: 'World', title: 'International Summit Produces Landmark Climate Agreement', source: pub },
        { cat: 'Science', title: 'Researchers Make Breakthrough Discovery in Quantum Computing', source: pub },
        { cat: 'Health', title: 'New Study Reveals Surprising Benefits of Mediterranean Diet', source: pub },
        { cat: 'Sports', title: 'Underdog Team Stuns Champions in Historic Upset Victory', source: pub },
        { cat: 'Technology', title: 'Revolutionary Battery Technology Could Double Electric Vehicle Range', source: 'Sponsored' },
        { cat: 'Finance', title: 'Central Bank Signals Major Shift in Monetary Policy Direction', source: pub },
        { cat: 'Culture', title: 'Celebrated Director Returns With Most Ambitious Film Yet', source: pub },
        { cat: 'Opinion', title: 'Why We Need to Rethink Our Approach to Digital Privacy', source: pub },
        { cat: 'World', title: 'Historic Peace Deal Signed After Years of Negotiations', source: pub },
        { cat: 'Tech', title: 'AI-Powered Tools Transform How Millions Work Every Day', source: 'Sponsored' },
    ];

    const cardHtml = (card, i) => {
        const isOpinion = card.cat === 'Opinion';
        const isSponsored = card.source === 'Sponsored';
        return `
            <a href="#" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;">
                <div style="width:100%;aspect-ratio:16/9;background:${bgSection};border-radius:${borderRadius};margin-bottom:10px;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;">
                    <svg width="48" height="48" fill="none" stroke="${textTertiary}" stroke-width="1.5" opacity="0.3"><rect x="8" y="8" width="32" height="32" rx="4"/><circle cx="18" cy="18" r="4"/><path d="M8 32l10-10 6 6 8-8 8 8"/></svg>
                    ${i % 4 === 2 ? `<div style="position:absolute;top:10px;right:10px;width:28px;height:28px;background:${primary};display:flex;align-items:center;justify-content:center;border-radius:${borderRadius};"><svg width="12" height="12" fill="white" viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"/></svg></div>` : ''}
                </div>
                <div style="font-size:${metaScale.size};color:${isOpinion ? primary : textSecondary};font-weight:${isOpinion ? 700 : 400};text-transform:uppercase;margin-bottom:4px;${isOpinion ? 'letter-spacing:0.5px;' : ''}">${card.cat}</div>
                <div style="font-size:${titleScale.size};font-weight:${titleScale.weight};line-height:${titleScale.line_height};color:${textPrimary};margin-bottom:8px;${isOpinion ? `font-family:'${fontSecondary}',serif;font-style:italic;` : `font-family:'${fontPrimary}',sans-serif;`}">${card.title}</div>
                <div style="font-size:${metaScale.size};color:${textTertiary};margin-top:auto;">${isSponsored ? '<span style="background:rgba(0,0,0,0.06);padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;">AD</span> ' : ''}${card.source}</div>
            </a>
        `;
    };

    prototypeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pub} | Native Feed Prototype</title>
    <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontPrimary)}:wght@400;700&${fontSecondary !== fontPrimary ? `family=${encodeURIComponent(fontSecondary)}:ital,wght@0,400;0,700;1,600&` : ''}display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: '${fontPrimary}', sans-serif; background: ${bgPage}; color: ${textPrimary}; line-height: 1.5; -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; color: inherit; }

        .site-header { background: ${bgPage}; border-bottom: 3px solid ${primary}; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
        .site-logo { font-size: 24px; font-weight: 800; color: ${textPrimary}; display: flex; align-items: center; gap: 4px; }
        .site-logo .dot { color: ${primary}; }
        .site-nav { display: flex; gap: 24px; font-size: 14px; font-weight: 600; color: ${textSecondary}; }

        .article-container { max-width: 800px; margin: 40px auto 0; padding: 0 24px; }
        .article-kicker { color: ${primary}; font-weight: 700; text-transform: uppercase; font-size: 14px; margin-bottom: 8px; letter-spacing: 0.5px; }
        .article-h1 { font-size: ${headlineScale.size}; line-height: 1.2; font-weight: ${headlineScale.weight}; margin-bottom: 16px; }
        .article-meta { font-size: ${metaScale.size}; color: ${textTertiary}; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; }
        .article-meta strong { color: ${textPrimary}; }
        .article-toolbar { display: flex; gap: 16px; padding: 12px 0; border-top: 1px solid ${borderColor}; border-bottom: 1px solid ${borderColor}; margin-bottom: 24px; }
        .toolbar-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; color: ${textSecondary}; font-size: 13px; font-family: '${fontPrimary}', sans-serif; }
        .article-hero { width: 100%; margin-bottom: 8px; overflow: hidden; border-radius: ${borderRadius}; }
        .article-caption { font-size: ${metaScale.size}; color: ${textTertiary}; margin-bottom: 24px; }
        .article-lead { font-size: 18px; font-weight: 700; color: ${textSecondary}; margin-bottom: 20px; line-height: 1.7; }
        .article-text { font-size: ${bodyScale.size}; color: ${textSecondary}; margin-bottom: 20px; line-height: ${bodyScale.line_height}; }

        .feed-wrapper { max-width: ${containerWidth}; margin: 0 auto 80px; padding: 0 24px; }
        .section-header { font-size: 36px; font-weight: 700; margin: 48px 0 8px; display: flex; justify-content: space-between; align-items: baseline; }
        .section-header-title::after { content: "."; color: ${primary}; }
        .feed-attribution { font-size: 11px; color: ${textTertiary}; margin-bottom: 16px; }
        .feed-attribution span { color: #3174E0; font-weight: 700; }
        .feed-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: ${gridGap}; margin-bottom: 40px; }
        .feed-grid.wide { grid-template-columns: repeat(4, 1fr); }

        .load-more { display: block; width: 100%; padding: 14px; background: ${bgSection}; border: 1px solid ${borderColor}; border-radius: ${borderRadius}; font-family: '${fontPrimary}', sans-serif; font-size: 14px; font-weight: 600; color: ${textSecondary}; cursor: pointer; text-align: center; margin: 24px 0; }
        .load-more:hover { background: ${bgSecondary}; }

        .separator { height: 1px; background: ${borderColor}; margin: 48px 0; }

        .prototype-badge { position: fixed; bottom: 20px; right: 20px; background: ${primary}; color: white; padding: 10px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 1000; display: flex; align-items: center; gap: 8px; }
        .prototype-badge svg { opacity: 0.8; }
    </style>
</head>
<body>
    <!-- Site Header -->
    <header class="site-header">
        <div class="site-logo">${pub}<span class="dot">.</span></div>
        <nav class="site-nav">
            <a href="#">News</a>
            <a href="#">Politics</a>
            <a href="#">Business</a>
            <a href="#">Sport</a>
            <a href="#">Culture</a>
        </nav>
    </header>

    <!-- Article -->
    <div class="article-container">
        <div class="article-kicker">${art.kicker || 'NEWS'}</div>
        <h1 class="article-h1">${art.title}</h1>
        <div class="article-meta">
            <span>By <strong>${art.author}</strong></span>
            <span>${art.date}</span>
        </div>
        <div class="article-toolbar">
            <button class="toolbar-btn"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v4h4l8-8-4-4-8 8z"/></svg> Comment</button>
            <button class="toolbar-btn"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v4m0 0H2v8h8v-2"/><path d="M8 10h8V2H8z"/></svg> Share</button>
            <button class="toolbar-btn"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3v14l7-5 7 5V3z"/></svg> Save</button>
        </div>
        <div class="article-hero">${heroPlaceholder}</div>
        <p class="article-caption">Image: ${pub} / Illustration</p>
        <p class="article-lead">${art.lead}</p>
        ${art.paragraphs.slice(0,4).map(p => `<p class="article-text">${p}</p>`).join('\n        ')}
    </div>

    <div class="separator" style="max-width:800px;margin:48px auto;"></div>

    <!-- Taboola Feed -->
    <div class="feed-wrapper">
        <div class="section-header">
            <span class="section-header-title">More For You</span>
        </div>
        <div class="feed-attribution">Content by <span>Taboola</span></div>

        <div class="feed-grid">
            ${sampleCards.slice(0,6).map((c,i) => cardHtml(c,i)).join('')}
        </div>

        <button class="load-more">Show More Stories</button>

        <div class="section-header" style="margin-top:40px;">
            <span class="section-header-title">Trending Now</span>
        </div>
        <div class="feed-attribution">Content by <span>Taboola</span></div>

        <div class="feed-grid wide">
            ${sampleCards.slice(6,12).map((c,i) => cardHtml(c,i+6)).join('')}
        </div>
    </div>

    <div class="prototype-badge">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="10" height="10" rx="2"/><path d="M5 5h4m-4 2h4m-4 2h2"/></svg>
        Brand Kit Prototype — ${pub}
    </div>
</body>
</html>`;

    // Render into iframe
    const frame = document.getElementById('prototypeFrame');
    frame.srcdoc = prototypeHtml;
    document.getElementById('prototypeUrlBar').textContent = `${(brandKit["meta.publisher"]||'publisher').toLowerCase().replace(/\s+/g,'-')}-feed-prototype.html`;
}

function downloadPrototype() {
    if (!prototypeHtml) generatePrototype();
    const name = (brandKit["meta.publisher"] || 'publisher').toLowerCase().replace(/\s+/g, '-');
    downloadFile(`${name}-feed-prototype.html`, prototypeHtml, 'text/html');
}

function openPrototypeNewTab() {
    if (!prototypeHtml) generatePrototype();
    const w = window.open();
    w.document.write(prototypeHtml);
    w.document.close();
}
