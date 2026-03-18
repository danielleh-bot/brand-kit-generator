// ============================================================
//  STEP 3: PROTOTYPE GENERATOR
//  Enhanced: RTL support, real images, localized labels, realistic feed
// ============================================================
function generatePrototype() {
    if (!brandKit) return;

    const kit = brandKit;
    const pub = kit.brand?.name || 'Publisher';
    const domain = kit.brand?.website || 'publisher.com';
    const lang = kit.brand_voice?.language || kit.brand?.language || 'en';
    const dir = kit.layout_patterns?.direction || pageDirection || 'ltr';
    const isRTL = dir === 'rtl';

    // Colors
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

    // Fonts
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

    // RTL-aware positioning helpers
    const startSide = isRTL ? 'right' : 'left';
    const endSide = isRTL ? 'left' : 'right';
    const marginStart = isRTL ? 'margin-left' : 'margin-right';
    const marginEnd = isRTL ? 'margin-right' : 'margin-left';

    // Article data
    const art = articleData || {
        title: 'Breaking News: Major Developments Unfold Across the Region',
        kicker: 'TOP STORY',
        author: 'Staff Writer',
        date: new Date().toLocaleDateString(lang, { year:'numeric', month:'long', day:'numeric' }),
        heroImage: '',
        lead: 'In a significant turn of events, developments continue to unfold that could reshape the landscape of the industry for years to come.',
        paragraphs: [
            'The implications of these changes are far-reaching, affecting millions of people across the country and beyond. Experts weigh in on what this means for the future.',
            'According to leading analysts, the shift represents one of the most significant transformations in the sector in decades. Industry leaders are scrambling to adapt their strategies.',
            '"This is a watershed moment," said one prominent industry figure who spoke on condition of anonymity. "The old ways of doing things are simply no longer viable."',
            'Government officials have indicated they are closely monitoring the situation and may introduce new regulatory frameworks in response to the changing dynamics.'
        ]
    };

    // Generate feed content with real extracted cards + images
    const nav = navigationData || { navLinks: [], footerLinks: [], socialLinks: [] };
    const feedContent = generateFeedContent(kit, nav, homepageCards, pageImages);

    // Hero image — use real image from article or extracted page images
    const heroSrc = art.heroImage || (pageImages && pageImages.length > 0 ? pageImages[0] : '');
    const heroHtml = heroSrc
        ? `<img src="${_escAttr(heroSrc)}" referrerpolicy="no-referrer" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;" onerror="this.style.display='none'" />`
        : '';

    // SVG placeholder icon for missing images
    const placeholderSvg = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="10" width="36" height="28" rx="3" stroke="${textTertiary}" stroke-width="1.5" fill="none" opacity="0.4"/><circle cx="17" cy="21" r="3.5" stroke="${textTertiary}" stroke-width="1.5" fill="none" opacity="0.4"/><path d="M6 32 l10-8 6 5 8-10 12 13" stroke="${textTertiary}" stroke-width="1.5" fill="none" opacity="0.4"/></svg>`;

    // Image helper for feed cards — shows real image or styled placeholder
    const cardImage = (card, size, idx) => {
        const src = card.thumbnail || card.image || '';
        // Deterministic fallback from picsum so cards always have a visible image
        const fallbackSrc = `https://picsum.photos/seed/bk${idx || 0}/400/300`;
        if (src) {
            return `<img src="${_escAttr(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;border-radius:${borderRadius} ${borderRadius} 0 0;background:${bgSection};" onerror="this.onerror=null;this.src='${fallbackSrc}';" />`;
        }
        // No image — use picsum fallback
        return `<img src="${fallbackSrc}" alt="" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;border-radius:${borderRadius} ${borderRadius} 0 0;background:${bgSection};" onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\\'width:100%;aspect-ratio:4/3;background:${bgSection};display:flex;align-items:center;justify-content:center;border-radius:${borderRadius} ${borderRadius} 0 0;\\'>${placeholderSvg}</div>';" />`;
    };

    // Feed card generator
    const feedCard = (card, size, idx) => {
        const fontSize = size === 'tiny' ? '13px' : (size === 'small' ? '14px' : '16px');
        const padding = size === 'tiny' ? '8px 4px' : '12px 4px';
        const badge = card.isNative
            ? (card.category ? `<span style="position:absolute;top:8px;${startSide}:8px;font-size:10px;padding:2px 6px;border-radius:3px;background:${primary};color:#fff;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">${_escHtml(card.category)}</span>` : '')
            : `<span style="position:absolute;top:8px;${startSide}:8px;font-size:10px;padding:2px 6px;border-radius:3px;background:rgba(0,0,0,0.6);color:#fff;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">${_escHtml(feedContent.sponsoredLabel)}</span>`;

        return `
            <div style="border-radius:${borderRadius};overflow:hidden;cursor:pointer;transition:box-shadow 0.2s;background:${bgPage};" onmouseover="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
                <div style="position:relative;">
                    ${cardImage(card, size, idx)}
                    ${badge}
                </div>
                <div style="padding:${padding};text-align:${startSide};">
                    <div style="font-family:'${fontPrimary}',sans-serif;font-size:${fontSize};font-weight:700;color:${textPrimary};line-height:1.3;margin-bottom:6px;">${_escHtml(card.headline)}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;${isRTL ? 'flex-direction:row-reverse;' : ''}">
                        <span style="font-size:12px;color:${textTertiary};text-transform:uppercase;letter-spacing:0.02em;">${_escHtml(card.source)}</span>
                        ${card.cta ? `<span style="font-size:12px;color:${primary};font-weight:600;">${_escHtml(card.cta)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    };

    // Section label
    const sectionLabel = (text) => `
        <div style="font-family:'${fontPrimary}',sans-serif;font-size:${sectionScale.size};font-weight:${sectionScale.weight};text-transform:uppercase;letter-spacing:0.05em;color:${textSecondary};padding-bottom:8px;margin-bottom:16px;border-bottom:3px solid ${primary};text-align:${startSide};direction:${dir};">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${primary};${isRTL ? 'margin-left' : 'margin-right'}:8px;vertical-align:middle;"></span>
            ${_escHtml(text)}
        </div>
    `;

    // Navigation links
    const navLinksHtml = nav.navLinks.slice(0, 8).map(l =>
        `<a href="#" style="color:rgba(255,255,255,0.85);font-size:14px;text-decoration:none;font-weight:500;">${_escHtml(l.text)}</a>`
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
                <h4 style="color:#fff;font-size:14px;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">${_escHtml(g.group)}</h4>
                ${g.links.map(l => `<a href="#" style="display:block;color:rgba(255,255,255,0.6);font-size:13px;padding:3px 0;text-decoration:none;">${_escHtml(l.text)}</a>`).join('')}
            </div>
        `).join('')
        : `<div><h4 style="color:#fff;font-size:14px;font-weight:700;margin:0 0 12px;">About</h4><a href="#" style="display:block;color:rgba(255,255,255,0.6);font-size:13px;padding:3px 0;">About Us</a><a href="#" style="display:block;color:rgba(255,255,255,0.6);font-size:13px;padding:3px 0;">Contact</a></div>
           <div><h4 style="color:#fff;font-size:14px;font-weight:700;margin:0 0 12px;">Legal</h4><a href="#" style="display:block;color:rgba(255,255,255,0.6);font-size:13px;padding:3px 0;">Privacy Policy</a><a href="#" style="display:block;color:rgba(255,255,255,0.6);font-size:13px;padding:3px 0;">Terms</a></div>`;

    // Build list feed card (horizontal layout, image on side) for dense sections
    const listCard = (card, idx) => {
        const src = card.thumbnail || card.image || '';
        const fallbackSrc = `https://picsum.photos/seed/bkl${idx || 0}/120/80`;
        const imgHtml = src
            ? `<img src="${_escAttr(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:120px;height:80px;object-fit:cover;border-radius:${borderRadius};flex-shrink:0;background:${bgSection};" onerror="this.onerror=null;this.src='${fallbackSrc}';" />`
            : `<img src="${fallbackSrc}" alt="" loading="lazy" style="width:120px;height:80px;object-fit:cover;border-radius:${borderRadius};flex-shrink:0;background:${bgSection};" />`;
        const badge = card.isNative ? '' : `<span style="font-size:10px;color:${textTertiary};text-transform:uppercase;letter-spacing:0.03em;">${_escHtml(feedContent.sponsoredLabel)}</span>`;
        return `
            <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid ${borderColor};cursor:pointer;align-items:center;${isRTL ? 'flex-direction:row-reverse;' : ''}" onmouseover="this.style.background='${bgSection}'" onmouseout="this.style.background='transparent'">
                ${imgHtml}
                <div style="flex:1;text-align:${startSide};">
                    ${badge}
                    <div style="font-family:'${fontPrimary}',sans-serif;font-size:14px;font-weight:700;color:${textPrimary};line-height:1.3;margin:2px 0 4px;">${_escHtml(card.headline)}</div>
                    <div style="font-size:12px;color:${textTertiary};">${_escHtml(card.source)}${card.cta ? ` · <span style="color:${primary};">${_escHtml(card.cta)}</span>` : ''}</div>
                </div>
            </div>
        `;
    };

    prototypeHtml = `<!DOCTYPE html>
<html lang="${_escAttr(lang)}" dir="${dir}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${_escHtml(pub)} — Feed Prototype</title>
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
        body {
            font-family: var(--font-body);
            background: var(--brand-bg);
            color: var(--brand-text);
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            direction: ${dir};
        }
        a { text-decoration: none; color: inherit; }
        a:hover { text-decoration: underline; }
        img { max-width: 100%; }
    </style>
</head>
<body>
    <!-- Navigation -->
    ${(() => {
        const hdrStyle = kit.layout_patterns?.header?.style || 'dark';
        const isLightHeader = hdrStyle === 'light';
        const hdrBg = isLightHeader ? (kit.layout_patterns?.header?.background || '#ffffff') : bgDark;
        const hdrTextColor = isLightHeader ? textPrimary : '#fff';
        const hdrLinkColor = isLightHeader ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)';
        const utilBarBg = isLightHeader ? bgSection : 'rgba(0,0,0,0.2)';
        const utilTextColor = isLightHeader ? textTertiary : 'rgba(255,255,255,0.7)';
        const accentBar = kit.layout_patterns?.header?.accent_bar_color || primary;

        // Logo rendering
        const logoType = kit.logos?.primary?.type || 'text';
        const logoUrl = kit.logos?.primary?.url;
        const logoSvg = kit.logos?.primary?.svg;
        let logoHtml;
        if (logoType === 'image' && logoUrl) {
            logoHtml = `<img src="${_escAttr(logoUrl)}" alt="${_escAttr(pub)}" referrerpolicy="no-referrer" style="height:36px;max-width:200px;object-fit:contain;" onerror="this.outerHTML='<span style=\\'font-family:var(--font-headline);font-size:24px;font-weight:700;color:${hdrTextColor};text-decoration:none;\\'>${_escHtml(pub)}<span style=\\'color:${primary};\\'>.</span></span>'" />`;
        } else if (logoType === 'svg' && logoSvg) {
            logoHtml = `<span style="display:inline-block;height:36px;">${logoSvg}</span>`;
        } else {
            logoHtml = `<span style="font-family:var(--font-headline);font-size:24px;font-weight:700;color:${hdrTextColor};">${_escHtml(pub)}<span style="color:${primary};">.</span></span>`;
        }

        // Rebuild nav links with correct color
        const navLinksColored = nav.navLinks.slice(0, 8).map(l =>
            `<a href="#" style="color:${hdrLinkColor};font-size:14px;text-decoration:none;font-weight:500;">${_escHtml(l.text)}</a>`
        ).join('') || ['News','Sports','Business','Opinion','Tech'].map(t =>
            `<a href="#" style="color:${hdrLinkColor};font-size:14px;">${t}</a>`
        ).join('');

        return `<nav style="background:${hdrBg};color:${hdrTextColor};padding:0;${isLightHeader ? 'border-bottom:1px solid ' + borderColor + ';' : ''}">
        <div style="background:${utilBarBg};padding:4px 0;font-size:12px;">
            <div style="max-width:1200px;margin:0 auto;padding:0 16px;display:flex;justify-content:space-between;align-items:center;${isRTL ? 'flex-direction:row-reverse;' : ''}">
                <span style="color:${utilTextColor};">${_escHtml(new Date().toLocaleDateString(lang, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))}</span>
                <span style="color:${utilTextColor};">${_escHtml(domain)}</span>
            </div>
        </div>
        <div style="max-width:1200px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:32px;${isRTL ? 'flex-direction:row-reverse;' : ''}">
            <a href="#" style="text-decoration:none;">${logoHtml}</a>
            <div style="display:flex;gap:20px;flex-wrap:wrap;${isRTL ? 'flex-direction:row-reverse;' : ''}">${navLinksColored}</div>
        </div>
        <div style="height:3px;background:${accentBar};"></div>`;
    })()}
    </nav>

    <!-- Hero Image -->
    ${heroSrc ? `<div style="max-width:1200px;margin:0 auto;padding:24px 16px 0;">
        <div style="overflow:hidden;border-radius:${borderRadius};">${heroHtml}</div>
    </div>` : ''}

    <!-- Article -->
    <article style="max-width:760px;margin:0 auto;padding:32px 16px;text-align:${startSide};">
        ${art.kicker ? `<div style="color:${primary};font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;margin-bottom:12px;">${_escHtml(art.kicker)}</div>` : ''}
        <h1 style="font-family:var(--font-headline);font-size:${headlineScale.size};font-weight:${headlineScale.weight};line-height:1.2;margin:0 0 16px;">${_escHtml(art.title)}</h1>
        ${art.lead ? `<p style="font-size:20px;color:${textSecondary};line-height:1.5;margin:0 0 20px;">${_escHtml(art.lead)}</p>` : ''}
        <div style="display:flex;align-items:center;gap:12px;padding:16px 0;border-top:1px solid ${borderColor};border-bottom:1px solid ${borderColor};margin-bottom:24px;${isRTL ? 'flex-direction:row-reverse;' : ''}">
            <span style="font-weight:600;font-size:14px;">${art.author ? _escHtml(art.author) : 'Staff Writer'}</span>
            <span style="color:${textTertiary};font-size:13px;">${_escHtml(art.date || '')}</span>
        </div>
        <div style="font-size:${bodyScale.size};line-height:${bodyScale.lineHeight || bodyScale.line_height || '1.7'};color:${textSecondary};">
            ${art.paragraphs.slice(0,5).map(p => `<p style="margin:0 0 20px;">${_escHtml(p)}</p>`).join('\n')}
        </div>
    </article>

    <!-- Taboola Feed -->
    <div style="max-width:760px;margin:0 auto;padding:0 16px 40px;">

        <!-- "More For You" Section Header with dot accent -->
        <div style="margin-bottom:24px;padding-top:24px;">
            <h2 style="font-family:var(--font-headline);font-size:28px;font-weight:700;color:${textPrimary};margin:0;text-align:${startSide};">
                ${_escHtml(feedContent.moreFromLabel)} ${_escHtml(pub)}<span style="color:${primary};">.</span>
            </h2>
            <div style="font-size:11px;color:${textTertiary};margin-top:4px;text-align:${startSide};">
                ${_escHtml(feedContent.contentByLabel || 'Content by')} <a href="#" style="color:${primary};text-decoration:none;font-weight:500;">Taboola</a>
            </div>
        </div>

        <!-- Row 1: Large Sponsored Grid (3-up) -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:32px;">
            ${feedContent.sponsoredLarge.map((c, i) => feedCard(c, 'small', i)).join('')}
            ${feedContent.sponsoredDense.length > 0 ? feedCard(feedContent.sponsoredDense[0], 'small', 3) : ''}
        </div>

        <!-- Row 2: Native Section (3-up grid) -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:32px;">
            ${feedContent.nativeSection.map((c, i) => feedCard(c, 'small', i + 20)).join('')}
        </div>

        <!-- Row 3: Mixed list-style cards -->
        <div style="margin-bottom:32px;border-top:1px solid ${borderColor};">
            ${feedContent.sponsoredDense.slice(1).map((c, i) => listCard(c, i + 10)).join('')}
        </div>

        <!-- "Trending Now" Section -->
        <div style="margin-bottom:32px;">
            <h2 style="font-family:var(--font-headline);font-size:22px;font-weight:700;color:${textPrimary};margin:0 0 16px;text-align:${startSide};">
                ${_escHtml(feedContent.trendingLabel)} ${_escHtml(pub)}<span style="color:${primary};">.</span>
            </h2>
            <div style="font-size:11px;color:${textTertiary};margin:-12px 0 16px;text-align:${startSide};">
                ${_escHtml(feedContent.contentByLabel || 'Content by')} <a href="#" style="color:${primary};text-decoration:none;font-weight:500;">Taboola</a>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
                ${feedContent.trendingNative.slice(0, 3).map((c, i) => feedCard(c, 'small', i + 40)).join('')}
            </div>
        </div>

        <!-- Row 4: Mixed Sponsored (2-up) -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:32px;">
            ${feedContent.sponsoredMixed.map((c, i) => feedCard(c, 'large', i + 30)).join('')}
        </div>

        <!-- Row 5: Final list-style sponsored -->
        <div style="margin-bottom:20px;border-top:1px solid ${borderColor};">
            ${feedContent.sponsoredFinal.map((c, i) => listCard(c, i + 50)).join('')}
        </div>

        <!-- Show More Stories button -->
        <div style="text-align:center;margin-bottom:24px;">
            <button style="background:transparent;border:1px solid ${borderColor};padding:12px 32px;font-size:14px;color:${textSecondary};cursor:pointer;border-radius:4px;font-family:var(--font-body);">
                ${lang.startsWith('he') ? 'הצג עוד כתבות' : lang.startsWith('de') ? 'Mehr Geschichten anzeigen' : 'Show More Stories'}
            </button>
        </div>

        <!-- Attribution -->
        <div style="text-align:center;padding:16px 0;font-size:11px;color:${textTertiary};">
            ${_escHtml(feedContent.contentByLabel || 'Content by')} <strong>Taboola</strong> | ${_escHtml(feedContent.sponsoredLabel)} Links
        </div>
    </div>

    <!-- Footer -->
    <footer style="background:${bgDark};color:rgba(255,255,255,0.7);padding:48px 16px 24px;">
        <div style="max-width:1200px;margin:0 auto;">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:32px;margin-bottom:32px;text-align:${startSide};">
                ${footerHtml}
            </div>
            ${nav.socialLinks.length > 0 ? `<div style="display:flex;gap:16px;margin-bottom:24px;${isRTL ? 'flex-direction:row-reverse;justify-content:flex-start;' : ''}">${nav.socialLinks.map(s => `<a href="#" style="color:rgba(255,255,255,0.5);font-size:13px;text-decoration:none;">${_escHtml(s.platform)}</a>`).join('')}</div>` : ''}
            <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;font-size:12px;opacity:0.5;text-align:${startSide};">
                &copy; ${new Date().getFullYear()} ${_escHtml(pub)}. All rights reserved. | Brand Kit Prototype generated by Taboola Brand Kit Generator
            </div>
        </div>
    </footer>

    <div style="position:fixed;bottom:20px;${endSide}:20px;background:${primary};color:white;padding:10px 18px;border-radius:8px;font-size:12px;font-weight:700;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:1000;display:flex;align-items:center;gap:8px;">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="10" height="10" rx="2"/><path d="M5 5h4m-4 2h4m-4 2h2"/></svg>
        Brand Kit Prototype — ${_escHtml(pub)}
    </div>
</body>
</html>`;

    // Render into iframe
    const frame = document.getElementById('prototypeFrame');
    frame.srcdoc = prototypeHtml;
    document.getElementById('prototypeUrlBar').textContent = `${pub.toLowerCase().replace(/\s+/g,'-')}-feed-prototype.html`;
}

// HTML escape helpers
function _escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _escAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
