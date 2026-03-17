// ============================================================
//  STEP 3: PROTOTYPE GENERATOR (Enhanced with feed content + font mapping)
// ============================================================
function generatePrototype() {
    if (!brandKit) return;

    const kit = brandKit;
    const pub = kit.brand?.name || 'Publisher';
    const domain = kit.brand?.website || 'publisher.com';
    const primary = kit.colors?.primary?.hex || '#2196F3';
    const textPrimary = kit.colors?.text?.primary?.hex || '#1A1A2E';
    const textSecondary = kit.colors?.text?.secondary?.hex || '#4A4A5A';
    const textTertiary = kit.colors?.text?.tertiary?.hex || '#8A8A9A';
    const bgPage = kit.colors?.backgrounds?.base?.hex || '#FFFFFF';
    const bgSection = kit.colors?.backgrounds?.section?.hex || '#F7F9FC';
    const bgSecondary = kit.colors?.backgrounds?.secondary?.hex || '#EBEFF7';
    const bgDark = kit.colors?.backgrounds?.dark?.hex || '#1a1a1a';
    const borderColor = kit.colors?.borders?.primary?.hex || '#E0E0E0';
    const borderRadius = kit.photo_style?.thumbnail_format?.border_radius || kit.layout_patterns?.card?.border_radius || '0px';
    const gridGap = kit.layout_patterns?.grid?.gap || '24px';
    const containerWidth = kit.layout_patterns?.container?.max_width || '1200px';

    // Resolve fonts via Google Fonts mapping
    const primaryFamily = kit.fonts?.primary?.family || 'sans-serif';
    const secondaryFamily = kit.fonts?.secondary?.family || primaryFamily;
    const resolvedPrimary = resolveGoogleFont(primaryFamily);
    const resolvedSecondary = resolveGoogleFont(secondaryFamily);
    const fontPrimary = resolvedPrimary ? resolvedPrimary.google : primaryFamily;
    const fontSecondary = resolvedSecondary ? resolvedSecondary.google : secondaryFamily;
    const googleFontsUrl = buildGoogleFontsUrl(kit);

    // Type scale
    const ts = kit.fonts?.type_scale || {};
    const titleScale = ts.article_title_card || { size: '16px', weight: 700, lineHeight: '1.2' };
    const headlineScale = ts.article_title_hero || { size: '36px', weight: 700 };
    const bodyScale = ts.article_body || { size: '18px', weight: 400, lineHeight: '1.7' };
    const metaScale = ts.meta_text || { size: '13px', weight: 400 };
    const sectionScale = ts.section_headings || { size: '13px', weight: 700 };

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

    // Generate rich feed content
    const nav = navigationData || { navLinks: [], footerLinks: [], socialLinks: [] };
    const feedContent = generateFeedContent(kit, nav);

    const heroPlaceholder = art.heroImage
        ? `<img src="${art.heroImage}" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;" crossorigin="anonymous" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div style="display:none;width:100%;aspect-ratio:16/9;background:${bgSection};align-items:center;justify-content:center;"><svg width="64" height="64" fill="none" stroke="${textTertiary}" stroke-width="1.5" opacity="0.4"><rect x="12" y="12" width="40" height="40" rx="4"/><circle cx="24" cy="24" r="5"/><path d="M12 44l14-14 8 8 10-10 8 8"/></svg></div>`
        : `<div style="width:100%;aspect-ratio:16/9;background:${bgSection};display:flex;align-items:center;justify-content:center;"><svg width="64" height="64" fill="none" stroke="${textTertiary}" stroke-width="1.5" opacity="0.4"><rect x="12" y="12" width="40" height="40" rx="4"/><circle cx="24" cy="24" r="5"/><path d="M12 44l14-14 8 8 10-10 8 8"/></svg></div>`;

    // Feed card generator
    const feedCard = (card, size) => {
        const isSmall = size === 'small' || size === 'tiny';
        const fontSize = size === 'tiny' ? '13px' : (size === 'small' ? '14px' : '16px');
        const padding = size === 'tiny' ? '8px 4px' : '12px 4px';
        return `
            <div style="border-radius:${borderRadius};overflow:hidden;cursor:pointer;transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
                <div style="position:relative;">
                    <img src="${card.thumbnail}" alt="${card.headline}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;border-radius:${borderRadius} ${borderRadius} 0 0;">
                    ${card.isNative
                        ? (card.category ? `<span style="position:absolute;top:8px;left:8px;font-size:10px;padding:2px 6px;border-radius:3px;background:${primary};color:#fff;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">${card.category}</span>` : '')
                        : `<span style="position:absolute;top:8px;left:8px;font-size:10px;padding:2px 6px;border-radius:3px;background:${bgSection};color:${textTertiary};text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Sponsored</span>`
                    }
                </div>
                <div style="padding:${padding};">
                    <div style="font-family:'${fontPrimary}',sans-serif;font-size:${fontSize};font-weight:700;color:${textPrimary};line-height:1.3;margin-bottom:6px;">${card.headline}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:12px;color:${textTertiary};text-transform:uppercase;letter-spacing:0.02em;">${card.source}</span>
                        ${card.cta ? `<span style="font-size:12px;color:${primary};font-weight:600;">${card.cta}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    };

    // Section label
    const sectionLabel = (text) => `
        <div style="font-family:'${fontPrimary}',sans-serif;font-size:${sectionScale.size};font-weight:${sectionScale.weight};text-transform:uppercase;letter-spacing:0.05em;color:${textSecondary};padding-bottom:8px;margin-bottom:16px;border-bottom:3px solid ${primary};">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${primary};margin-right:8px;vertical-align:middle;"></span>
            ${text}
        </div>
    `;

    // Navigation links
    const navLinksHtml = nav.navLinks.slice(0, 8).map(l =>
        `<a href="#" style="color:rgba(255,255,255,0.85);font-size:14px;text-decoration:none;font-weight:500;">${l.text}</a>`
    ).join('') || `
        <a href="#" style="color:rgba(255,255,255,0.85);font-size:14px;">News</a>
        <a href="#" style="color:rgba(255,255,255,0.85);font-size:14px;">Sports</a>
        <a href="#" style="color:rgba(255,255,255,0.85);font-size:14px;">Business</a>
        <a href="#" style="color:rgba(255,255,255,0.85);font-size:14px;">Opinion</a>
        <a href="#" style="color:rgba(255,255,255,0.85);font-size:14px;">Tech</a>
    `;

    // Footer
    const footerHtml = nav.footerLinks.length > 0
        ? nav.footerLinks.map(g => `
            <div>
                <h4 style="color:#fff;font-size:14px;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">${g.group}</h4>
                ${g.links.map(l => `<a href="#" style="display:block;color:rgba(255,255,255,0.6);font-size:13px;padding:3px 0;text-decoration:none;">${l.text}</a>`).join('')}
            </div>
        `).join('')
        : `<div><h4 style="color:#fff;font-size:14px;font-weight:700;margin:0 0 12px;">About</h4><a href="#" style="display:block;color:rgba(255,255,255,0.6);font-size:13px;padding:3px 0;">About Us</a><a href="#" style="display:block;color:rgba(255,255,255,0.6);font-size:13px;padding:3px 0;">Contact</a></div>
           <div><h4 style="color:#fff;font-size:14px;font-weight:700;margin:0 0 12px;">Legal</h4><a href="#" style="display:block;color:rgba(255,255,255,0.6);font-size:13px;padding:3px 0;">Privacy Policy</a><a href="#" style="display:block;color:rgba(255,255,255,0.6);font-size:13px;padding:3px 0;">Terms</a></div>`;

    prototypeHtml = `<!DOCTYPE html>
<html lang="${kit.brand_voice?.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pub} — Feed Prototype</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${googleFontsUrl}" rel="stylesheet">
    <style>
        :root {
            --brand-primary: ${primary};
            --brand-text: ${textPrimary};
            --brand-text-secondary: ${textSecondary};
            --brand-text-tertiary: ${textTertiary};
            --brand-bg: ${bgPage};
            --brand-bg-section: ${bgSection};
            --brand-bg-dark: ${bgDark};
            --font-headline: '${fontPrimary}', sans-serif;
            --font-body: '${fontSecondary}', sans-serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-body); background: var(--brand-bg); color: var(--brand-text); line-height: 1.5; -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; color: inherit; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav style="background:${bgDark};color:#fff;padding:0;">
        <div style="background:rgba(0,0,0,0.2);padding:4px 0;font-size:12px;">
            <div style="max-width:1200px;margin:0 auto;padding:0 16px;display:flex;justify-content:space-between;align-items:center;">
                <span style="opacity:0.7;">${kit.brand_voice?.language || 'en'}</span>
                <span style="opacity:0.7;">${pub}</span>
            </div>
        </div>
        <div style="max-width:1200px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:32px;">
            <a href="#" style="font-family:var(--font-headline);font-size:24px;font-weight:700;color:#fff;text-decoration:none;">${pub}<span style="color:${primary};">.</span></a>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">${navLinksHtml}</div>
        </div>
    </nav>

    <!-- Hero Image -->
    ${art.heroImage ? `<div style="max-width:1200px;margin:0 auto;padding:24px 16px 0;">
        <div style="overflow:hidden;border-radius:${borderRadius};">${heroPlaceholder}</div>
    </div>` : ''}

    <!-- Article -->
    <article style="max-width:760px;margin:0 auto;padding:32px 16px;">
        ${art.kicker ? `<div style="color:${primary};font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;margin-bottom:12px;">${art.kicker}</div>` : ''}
        <h1 style="font-family:var(--font-headline);font-size:${headlineScale.size};font-weight:${headlineScale.weight};line-height:1.2;margin:0 0 16px;">${art.title}</h1>
        ${art.lead ? `<p style="font-size:20px;color:${textSecondary};line-height:1.5;margin:0 0 20px;">${art.lead}</p>` : ''}
        <div style="display:flex;align-items:center;gap:12px;padding:16px 0;border-top:1px solid ${borderColor};border-bottom:1px solid ${borderColor};margin-bottom:24px;">
            <span style="font-weight:600;font-size:14px;">By ${art.author || 'Staff Writer'}</span>
            <span style="color:${textTertiary};font-size:13px;">${art.date || ''}</span>
        </div>
        <div style="font-size:${bodyScale.size};line-height:${bodyScale.lineHeight || bodyScale.line_height || '1.7'};color:${textSecondary};">
            ${art.paragraphs.slice(0,5).map(p => `<p style="margin:0 0 20px;">${p}</p>`).join('\n')}
        </div>
    </article>

    <!-- Taboola Feed -->
    <div style="max-width:760px;margin:0 auto;padding:0 16px 40px;">
        <div style="border-top:3px solid ${primary};padding-top:16px;margin-bottom:24px;">
            ${sectionLabel('Sponsored Stories')}
        </div>

        <!-- Large Sponsored (2-up) -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:32px;">
            ${feedContent.sponsoredLarge.map(c => feedCard(c, 'large')).join('')}
        </div>

        <!-- Dense Sponsored (3-up) -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px;">
            ${feedContent.sponsoredDense.map(c => feedCard(c, 'small')).join('')}
        </div>

        <!-- Native Section -->
        <div style="margin-bottom:32px;">
            ${sectionLabel('More From ' + pub)}
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
                ${feedContent.nativeSection.map(c => feedCard(c, 'small')).join('')}
            </div>
        </div>

        <!-- Mixed Sponsored (2-up) -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:32px;">
            ${feedContent.sponsoredMixed.map(c => feedCard(c, 'large')).join('')}
        </div>

        <!-- Trending Native (4-up) -->
        <div style="margin-bottom:32px;">
            ${sectionLabel('Trending on ' + pub)}
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;">
                ${feedContent.trendingNative.map(c => feedCard(c, 'tiny')).join('')}
            </div>
        </div>

        <!-- Final Sponsored -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
            ${feedContent.sponsoredFinal.map(c => feedCard(c, 'large')).join('')}
        </div>

        <!-- Attribution -->
        <div style="text-align:center;padding:16px 0;font-size:11px;color:${textTertiary};">
            by <strong>Taboola</strong> | Sponsored Links
        </div>
    </div>

    <!-- Footer -->
    <footer style="background:${bgDark};color:rgba(255,255,255,0.7);padding:48px 16px 24px;">
        <div style="max-width:1200px;margin:0 auto;">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:32px;margin-bottom:32px;">
                ${footerHtml}
            </div>
            ${nav.socialLinks.length > 0 ? `<div style="display:flex;gap:16px;margin-bottom:24px;">${nav.socialLinks.map(s => `<a href="#" style="color:rgba(255,255,255,0.5);font-size:13px;text-decoration:none;">${s.platform}</a>`).join('')}</div>` : ''}
            <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;font-size:12px;opacity:0.5;">
                &copy; 2025 ${pub}. All rights reserved. | Brand Kit Prototype generated by Taboola Brand Kit Generator
            </div>
        </div>
    </footer>

    <div style="position:fixed;bottom:20px;right:20px;background:${primary};color:white;padding:10px 18px;border-radius:8px;font-size:12px;font-weight:700;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:1000;display:flex;align-items:center;gap:8px;">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="10" height="10" rx="2"/><path d="M5 5h4m-4 2h4m-4 2h2"/></svg>
        Brand Kit Prototype — ${pub}
    </div>
</body>
</html>`;

    // Render into iframe
    const frame = document.getElementById('prototypeFrame');
    frame.srcdoc = prototypeHtml;
    document.getElementById('prototypeUrlBar').textContent = `${pub.toLowerCase().replace(/\s+/g,'-')}-feed-prototype.html`;
}

function downloadPrototype() {
    if (!prototypeHtml) generatePrototype();
    const name = (brandKit.brand?.name || 'publisher').toLowerCase().replace(/\s+/g, '-');
    downloadFile(`${name}-feed-prototype.html`, prototypeHtml, 'text/html');
}

function openPrototypeNewTab() {
    if (!prototypeHtml) generatePrototype();
    const w = window.open();
    w.document.write(prototypeHtml);
    w.document.close();
}
