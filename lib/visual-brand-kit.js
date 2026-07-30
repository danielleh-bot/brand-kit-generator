// ============================================================
//  Visual Brand Kit HTML renderer
//  Each property: Source screenshot mock | Suggested feed | Tier
// ============================================================

const { TIERS } = require('./property-tiers');
const { buildPublisherProperties, commonVisualTokens } = require('./publisher-properties');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSourceVisual(v) {
  if (!v) return '<div class="viz empty">No source visual</div>';
  switch (v.kind) {
    case 'color-chip-header':
      return `<div class="viz source-viz">
        <div class="mock-header" style="background:${esc(v.primary)}">
          <span class="mock-logo">${esc(v.label)}</span>
          <span class="mock-cta">CTA</span>
        </div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'type-specimen':
      return `<div class="viz source-viz">
        <div class="type-spec" style="font-family:${esc(v.font)};color:${esc(v.text)}">${esc(v.sample)}</div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'radius-card':
      return `<div class="viz source-viz">
        <div class="radius-demo">
          <div class="radius-thumb" style="border-radius:${esc(v.radius)};background:linear-gradient(135deg,${esc(v.primary)},#888)"></div>
        </div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'button':
      return `<div class="viz source-viz">
        <button class="mock-btn" style="background:${esc(v.primary)};color:${esc(v.textColor || '#fff')};border-radius:${esc(v.btnRadius)};font-family:${esc(v.font)}">${esc(v.label)}</button>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'badge':
      return `<div class="viz source-viz">
        <span class="mock-badge" style="background:${esc(v.bg)};color:${esc(v.color)};border-radius:${esc(v.radius)}">${esc(v.label)}</span>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'recipe-strip':
      return `<div class="viz source-viz">
        <div class="recipe-strip" style="border-color:${esc(v.primary)}">
          <div class="rs-icon">⏱</div>
          <div class="rs-items">${(v.items || []).map((i) =>
            `<div><strong style="color:${esc(v.primary)}">${esc(i.strong)}</strong><br><span>${esc(i.label)}</span></div>`
          ).join('')}</div>
        </div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'section-label':
      return `<div class="viz source-viz">
        <div class="section-lab" style="color:${esc(v.primary)};font-family:${esc(v.font)};border-color:${esc(v.primary)}">${esc(v.label)}</div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'voice':
      return `<div class="viz source-viz">
        <div class="voice-box">
          <div class="voice-tone" style="color:${esc(v.primary)}">${esc(v.tone)}</div>
          <div class="voice-sample" style="font-family:${esc(v.font)}">“${esc(v.sample)}”</div>
        </div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'accent-dot':
      return `<div class="viz source-viz">
        <div class="accent-dot-row" style="font-family:${esc(v.font)};color:${esc(v.text)}">
          <span class="dot" style="background:${esc(v.primary)}"></span>${esc(v.label)}
        </div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'kicker-row':
      return `<div class="viz source-viz">
        <div class="kicker-row">${(v.items || []).map((i) =>
          `<span class="mock-badge" style="background:${esc(i.bg)};color:${esc(i.color)};border-radius:2px">${esc(i.label)}</span>`
        ).join('')}</div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'live-badge':
      return `<div class="viz source-viz">
        <div class="live-row">
          <span class="live-pill" style="background:${esc(v.live)}">● LIVE</span>
          <span class="score">KC 24 · BUF 21</span>
        </div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'card-types':
      return `<div class="viz source-viz">
        <div class="card-types">
          <div class="ct ct-lg" style="border-color:${esc(v.primary)}">1×1</div>
          <div class="ct" style="border-color:${esc(v.primary)}">2×1</div>
          <div class="ct ct-sm" style="border-color:${esc(v.primary)}">4×1</div>
        </div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    case 'phone-frame':
      return `<div class="viz source-viz">
        <div class="phone">
          <div class="phone-bar" style="background:${esc(v.primary)}"></div>
          <div class="phone-body"><div class="ph-card"></div><div class="ph-card"></div></div>
        </div>
        <p class="viz-cap">${esc(v.caption)}</p>
      </div>`;
    default:
      return `<div class="viz empty">${esc(v.kind)}</div>`;
  }
}

function renderFeedCard(v) {
  const ring = (part) => (v.highlight === part ? ' hl' : '');
  const badge = v.badgeLabel
    ? `<span class="fc-badge${ring('badge')}" style="background:${esc(v.badgeBg || '#f3f4f6')};color:${esc(v.badgeColor || '#666')};border-radius:${esc(v.badgeRadius || '3px')}">${esc(v.badgeLabel)}</span>`
    : '';
  const kicker = v.kicker
    ? `<div class="fc-kicker${ring('kicker')}" style="color:${esc(v.kickerColor || v.primary)}">${esc(v.kicker)}</div>`
    : '';
  const meta = v.uniqueMeta
    ? `<div class="fc-meta${ring('meta')}" style="color:${esc(v.primary)}">${esc(v.uniqueMeta)}</div>`
    : '';
  const note = v.platformNote
    ? `<div class="platform-note">${esc(v.platformNote)}</div>`
    : v.softNote
      ? `<div class="soft-note">${esc(v.softNote)}</div>`
      : '';
  return `<div class="viz feed-viz">
    <div class="trc-label">Current feed surface (suggested)</div>
    <div class="fc${ring('accent')}">
      <div class="fc-thumb${ring('thumb')}" style="border-radius:${esc(v.radius)};background:linear-gradient(135deg,#ccc,#999)"></div>
      <div class="fc-body">
        ${kicker}
        <div class="fc-title${ring('title')}" style="font-family:${esc(v.font)};color:${esc(v.text)};${v.highlight === 'accent' ? `text-decoration:underline;text-decoration-color:${esc(v.primary)};text-decoration-thickness:2px` : ''}">${esc(v.title)}</div>
        <div class="fc-source" style="color:${esc(v.muted)}">${esc(v.source)}</div>
        ${meta}
        ${badge}
      </div>
    </div>
    ${note}
  </div>`;
}

function renderFeedVisual(v) {
  if (!v) return '<div class="viz empty">No feed visual</div>';
  if (v.kind === 'feed-card') return renderFeedCard(v);
  if (v.kind === 'more-button') {
    return `<div class="viz feed-viz">
      <div class="trc-label">Current feed surface (suggested)</div>
      <button class="mock-btn" style="background:${esc(v.primary)};color:#fff;border-radius:${esc(v.btnRadius)};font-family:${esc(v.font)}">${esc(v.label)}</button>
      <p class="viz-cap">.tbl-feed-more-btn</p>
    </div>`;
  }
  if (v.kind === 'feed-header') {
    return `<div class="viz feed-viz">
      <div class="trc-label">Current feed surface (suggested)</div>
      <div class="feed-hdr" style="border-color:${esc(v.primary)};font-family:${esc(v.font)};color:${esc(v.text)}">
        ${v.withDot ? `<span class="dot" style="background:${esc(v.primary)}"></span>` : ''}${esc(v.label)}
      </div>
    </div>`;
  }
  if (v.kind === 'section-grid') {
    return `<div class="viz feed-viz">
      <div class="trc-label">Suggested (not in default thumbs)</div>
      <div class="section-lab" style="color:${esc(v.primary)};font-family:${esc(v.font)};border-color:${esc(v.primary)}">${esc(v.label)}</div>
      <div class="mini-grid">
        <div class="mg"></div><div class="mg"></div><div class="mg"></div><div class="mg"></div>
      </div>
      <div class="platform-note">${esc(v.platformNote)}</div>
    </div>`;
  }
  if (v.kind === 'premium-stream') {
    return `<div class="viz feed-viz">
      <div class="trc-label">Suggested Premium stream</div>
      <div class="prem">
        <div class="prem-hero" style="background:${esc(v.primary)}"></div>
        <div class="prem-row"><div></div><div></div></div>
      </div>
      <div class="platform-note">${esc(v.platformNote)}</div>
    </div>`;
  }
  if (v.kind === 'phone-feed') {
    return `<div class="viz feed-viz">
      <div class="trc-label">Suggested TrueNative</div>
      <div class="phone">
        <div class="phone-bar" style="background:${esc(v.primary)}"></div>
        <div class="phone-body"><div class="ph-card branded" style="border-color:${esc(v.primary)}"></div><div class="ph-card branded" style="border-color:${esc(v.primary)}"></div></div>
      </div>
      <div class="platform-note">${esc(v.platformNote)}</div>
    </div>`;
  }
  return `<div class="viz empty">${esc(v.kind)}</div>`;
}

function tierBadge(tierId) {
  const t = TIERS[tierId] || TIERS.standard;
  return `<span class="tier" style="background:${t.bg};color:${t.color};border:1px solid ${t.color}33">${esc(t.label)}</span>`;
}

function buildMatrix(slug, brandKit) {
  const properties = buildPublisherProperties(slug, brandKit);
  const counts = { standard: 0, partial: 0, unique: 0, soft: 0 };
  for (const p of properties) {
    if (counts[p.tier] != null) counts[p.tier]++;
  }
  const total = properties.length || 1;
  return {
    slug,
    brand: brandKit?.brand?.name || slug,
    generatedAt: new Date().toISOString().slice(0, 10),
    counts,
    mvpCoveragePct: Math.round((counts.standard / total) * 100),
    properties: properties.map((p) => ({
      id: p.id,
      label: p.label,
      tokenPath: p.tokenPath,
      value: p.value,
      tier: p.tier,
      trcTargets: p.trcTargets,
      abImplication: p.abImplication,
      notes: p.notes,
      provenance: p.provenance,
      // visuals kept for HTML only — strip heavy objects in JSON export optionally
      hasSourceVisual: Boolean(p.sourceVisual),
      hasFeedVisual: Boolean(p.feedVisual),
    })),
    _full: properties,
  };
}

function renderVisualBrandKitHtml(slug, brandKit, matrix) {
  const t = commonVisualTokens(brandKit);
  const props = matrix._full || buildPublisherProperties(slug, brandKit);
  const { counts, mvpCoveragePct } = matrix;
  const tierFilters = Object.keys(TIERS)
    .map(
      (id) =>
        `<button type="button" class="filter-btn" data-tier="${id}" onclick="filterTier('${id}')">${esc(TIERS[id].short)} <em>${counts[id] || 0}</em></button>`
    )
    .join('');

  const cards = props
    .map((p) => {
      const tier = TIERS[p.tier] || TIERS.standard;
      const targets =
        p.trcTargets && p.trcTargets.length
          ? `<code class="targets">${esc(p.trcTargets.join(' · '))}</code>`
          : `<span class="no-hook">No TRC selector hook</span>`;
      return `<article class="prop-card" data-tier="${esc(p.tier)}" style="border-top:3px solid ${tier.color}">
        <header class="prop-head">
          <div>
            <h3>${esc(p.label)}</h3>
            <div class="token-path">${esc(p.tokenPath)}</div>
          </div>
          ${tierBadge(p.tier)}
        </header>
        <div class="prop-value">${esc(typeof p.value === 'string' ? p.value : JSON.stringify(p.value))}</div>
        <div class="viz-grid">
          <div>
            <div class="col-label">1 · Source (publisher)</div>
            ${renderSourceVisual(p.sourceVisual)}
          </div>
          <div>
            <div class="col-label">2 · Suggested on current feed</div>
            ${renderFeedVisual(p.feedVisual)}
          </div>
        </div>
        <footer class="prop-foot">
          <div><span class="foot-lab">Integration</span> ${targets}</div>
          <div><span class="foot-lab">A/B</span> ${esc(p.abImplication)}</div>
          ${p.notes ? `<div><span class="foot-lab">Note</span> ${esc(p.notes)}</div>` : ''}
          <div><span class="foot-lab">Provenance</span> ${esc(p.provenance)} visual mock from brand kit / ideal prototype</div>
        </footer>
      </article>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(t.name)} — Visual Brand Kit (Unique vs Standard)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #12141a;
    --muted: #5c6470;
    --line: #e4e7ec;
    --bg: #f4f5f7;
    --card: #ffffff;
    --primary: ${esc(t.primary)};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans', system-ui, sans-serif;
    background:
      radial-gradient(1200px 500px at 10% -10%, color-mix(in srgb, var(--primary) 18%, transparent), transparent),
      linear-gradient(180deg, #fafafa 0%, var(--bg) 40%);
    color: var(--ink);
    line-height: 1.45;
  }
  .top {
    position: sticky; top: 0; z-index: 40;
    backdrop-filter: blur(10px);
    background: rgba(255,255,255,0.9);
    border-bottom: 1px solid var(--line);
    padding: 14px 28px;
    display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between;
  }
  .brand-title {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 28px; letter-spacing: -0.02em;
  }
  .brand-title span { color: var(--primary); }
  .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .summary {
    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
  }
  .pill-stat {
    background: #fff; border: 1px solid var(--line); border-radius: 999px;
    padding: 6px 12px; font-size: 12px; font-weight: 600;
  }
  .pill-stat em { font-style: normal; color: var(--primary); }
  .filters { display: flex; gap: 6px; flex-wrap: wrap; }
  .filter-btn, .filter-all {
    border: 1px solid var(--line); background: #fff; border-radius: 999px;
    padding: 6px 12px; font: inherit; font-size: 12px; font-weight: 600;
    cursor: pointer; color: var(--muted);
  }
  .filter-btn.active, .filter-all.active { background: var(--ink); color: #fff; border-color: var(--ink); }
  .filter-btn em { font-style: normal; opacity: 0.7; margin-left: 4px; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 28px 20px 64px; }
  .intro {
    margin-bottom: 24px; padding: 20px 22px; background: var(--card);
    border: 1px solid var(--line); border-radius: 12px;
  }
  .intro h2 { font-size: 15px; margin-bottom: 8px; }
  .intro p { font-size: 13px; color: var(--muted); max-width: 70ch; }
  .legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .tier { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.02em; }
  .links { margin-top: 12px; font-size: 12px; }
  .links a { color: var(--primary); margin-right: 14px; }
  .prop-card {
    background: var(--card); border: 1px solid var(--line); border-radius: 14px;
    padding: 18px 18px 14px; margin-bottom: 18px;
    box-shadow: 0 1px 0 rgba(16,24,40,0.02);
  }
  .prop-card.hidden { display: none; }
  .prop-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
  .prop-head h3 { font-size: 17px; letter-spacing: -0.01em; }
  .token-path { font-size: 11px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin-top: 3px; }
  .prop-value { font-size: 13px; color: var(--ink); margin-bottom: 14px; padding: 8px 10px; background: #f8f9fb; border-radius: 8px; }
  .viz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 760px) { .viz-grid { grid-template-columns: 1fr; } }
  .col-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .viz { background: #fafbfc; border: 1px solid var(--line); border-radius: 10px; padding: 14px; min-height: 140px; }
  .viz-cap { font-size: 11px; color: var(--muted); margin-top: 10px; }
  .trc-label { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #98a2b3; margin-bottom: 8px; }
  .mock-header { display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-radius:8px; color:#fff; }
  .mock-logo { font-weight: 800; letter-spacing: 0.04em; }
  .mock-cta { background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 999px; font-size: 11px; }
  .type-spec { font-size: 28px; font-weight: 700; line-height: 1.15; }
  .radius-demo { display:flex; gap:12px; align-items:center; }
  .radius-thumb { width: 120px; height: 72px; }
  .mock-btn { border:0; padding:10px 18px; font-weight:700; font-size:13px; cursor:default; }
  .mock-badge { display:inline-block; padding:3px 10px; font-size:11px; font-weight:700; }
  .recipe-strip { display:flex; gap:16px; align-items:center; border-top:2px solid; padding:12px; background:#fff; }
  .rs-items { display:flex; gap:16px; font-size:12px; color:#444; }
  .section-lab { font-weight:800; font-size:15px; border-bottom:2px solid; padding-bottom:6px; }
  .voice-tone { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px; }
  .voice-sample { font-size:16px; font-weight:600; line-height:1.3; }
  .accent-dot-row { font-weight:800; letter-spacing:0.06em; display:flex; align-items:center; gap:8px; }
  .dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
  .kicker-row { display:flex; gap:8px; flex-wrap:wrap; }
  .live-row { display:flex; gap:12px; align-items:center; }
  .live-pill { color:#fff; font-size:11px; font-weight:800; padding:4px 8px; border-radius:4px; }
  .score { font-weight:700; font-size:14px; }
  .card-types { display:flex; gap:8px; align-items:stretch; }
  .ct { flex:1; border:2px solid; border-radius:8px; min-height:48px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; background:#fff; }
  .ct-lg { flex:1.4; min-height:72px; }
  .ct-sm { flex:0.8; }
  .phone { width:120px; border:2px solid #222; border-radius:18px; overflow:hidden; background:#fff; margin:0 auto; }
  .phone-bar { height:22px; }
  .phone-body { padding:8px; display:flex; flex-direction:column; gap:6px; }
  .ph-card { height:36px; background:#e8e8e8; border-radius:6px; }
  .ph-card.branded { border:2px solid; background:#f5f5f5; }
  .fc { display:flex; gap:12px; align-items:stretch; }
  .fc-thumb { width:96px; height:68px; flex-shrink:0; background:#ddd; }
  .fc-title { font-size:14px; font-weight:700; line-height:1.25; margin-bottom:4px; }
  .fc-source { font-size:11px; }
  .fc-meta { font-size:12px; font-weight:700; margin-top:4px; }
  .fc-kicker { font-size:10px; font-weight:800; letter-spacing:0.08em; margin-bottom:4px; }
  .fc-badge { display:inline-block; margin-top:6px; font-size:10px; font-weight:700; padding:2px 8px; }
  .hl { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 4px; }
  .platform-note, .soft-note {
    margin-top: 10px; font-size: 11px; font-weight: 600; padding: 6px 8px; border-radius: 6px;
  }
  .platform-note { background: #fdecea; color: #b42318; }
  .soft-note { background: #f3e8ff; color: #5b21b6; }
  .feed-hdr { font-weight:800; font-size:15px; border-top:3px solid; padding-top:10px; display:flex; align-items:center; gap:8px; }
  .mini-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:10px; }
  .mg { height:48px; background:linear-gradient(135deg,#ddd,#bbb); border-radius:4px; }
  .prem-hero { height:64px; border-radius:8px; margin-bottom:6px; opacity:0.85; }
  .prem-row { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .prem-row div { height:40px; background:#e5e5e5; border-radius:6px; }
  .prop-foot { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); display: grid; gap: 6px; font-size: 12px; color: var(--muted); }
  .foot-lab { font-weight: 700; color: var(--ink); margin-right: 6px; }
  .targets { font-size: 10px; background: #f2f4f7; padding: 2px 6px; border-radius: 4px; }
  .no-hook { color: #b42318; font-weight: 600; }
  .mvp-box {
    margin-top: 28px; padding: 20px; border-radius: 12px; border: 1px solid var(--line); background: #fff;
  }
  .mvp-box h2 { font-size: 16px; margin-bottom: 10px; }
  .mvp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 760px) { .mvp-cols { grid-template-columns: 1fr; } }
  .mvp-cols h3 { font-size: 13px; margin-bottom: 8px; }
  .mvp-cols ul { padding-left: 18px; font-size: 13px; color: var(--muted); }
  .mvp-cols li { margin-bottom: 6px; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="brand-title"><span>${esc(t.name)}</span> Visual Brand Kit</div>
      <div class="sub">Unique vs Standard — source evidence → suggested feed application → ship tier</div>
    </div>
    <div class="summary">
      <div class="pill-stat">MVP coverage <em>${mvpCoveragePct}%</em></div>
      <div class="pill-stat">Standard <em>${counts.standard}</em></div>
      <div class="pill-stat">Partial <em>${counts.partial}</em></div>
      <div class="pill-stat">Unique <em>${counts.unique}</em></div>
      <div class="pill-stat">Soft <em>${counts.soft}</em></div>
    </div>
  </div>

  <div class="wrap">
    <div class="intro">
      <h2>How to read this kit</h2>
      <p>Each property shows (1) where it appears on the publisher site, (2) how it should apply on <strong>today’s</strong> Taboola feed surface (TRC card anatomy), and (3) whether it ships via loader CSS / <code>__style__</code> (Standard), loses fidelity (Partial), needs platform/card markup (Unique), or needs Gen AI / editorial rewrite (Soft). Source visuals are high-fidelity mocks from the brand kit and ideal prototype — tagged prototype provenance when live capture is unavailable.</p>
      <div class="legend">
        ${Object.values(TIERS).map((x) => tierBadge(x.id) + ` <span style="font-size:11px;color:var(--muted);margin-right:8px">${esc(x.meaning)}</span>`).join('')}
      </div>
      <div class="links">
        <a href="./feed-prototype.html">Ideal feed prototype</a>
        <a href="./brand-kit.json">brand-kit.json</a>
        <a href="./property-matrix.json">property-matrix.json</a>
        <a href="./mvp-checklist.md">MVP vs ideal checklist</a>
      </div>
      <div class="filters" style="margin-top:14px">
        <button type="button" class="filter-all active" onclick="filterTier('all')">All</button>
        ${tierFilters}
      </div>
    </div>

    <div id="cards">${cards}</div>

    <div class="mvp-box" id="mvp">
      <h2>A/B variant framing</h2>
      <div class="mvp-cols">
        <div>
          <h3>Variant A — MVP (loader paint)</h3>
          <ul>
            ${props.filter((p) => p.tier === 'standard' || p.tier === 'partial').map((p) => `<li><strong>${esc(p.label)}</strong> — ${esc(p.abImplication)}</li>`).join('') || '<li>None classified</li>'}
          </ul>
        </div>
        <div>
          <h3>Variant B — Ideal subset (platform / Gen AI)</h3>
          <ul>
            ${props.filter((p) => p.tier === 'unique' || p.tier === 'soft').map((p) => `<li><strong>${esc(p.label)}</strong> — ${esc(p.abImplication)}</li>`).join('') || '<li>None classified</li>'}
          </ul>
        </div>
      </div>
    </div>
  </div>

<script>
function filterTier(tier) {
  document.querySelectorAll('.prop-card').forEach(function (el) {
    el.classList.toggle('hidden', tier !== 'all' && el.getAttribute('data-tier') !== tier);
  });
  document.querySelectorAll('.filter-btn, .filter-all').forEach(function (btn) {
    var active = (tier === 'all' && btn.classList.contains('filter-all')) || btn.getAttribute('data-tier') === tier;
    btn.classList.toggle('active', active);
  });
}
</script>
</body>
</html>`;
}

function buildMvpChecklistMarkdown(slug, brandKit, matrix) {
  const props = matrix._full || [];
  const name = brandKit?.brand?.name || slug;
  const mvp = props.filter((p) => p.tier === 'standard' || p.tier === 'partial');
  const ideal = props.filter((p) => p.tier === 'unique' || p.tier === 'soft');
  return `# ${name} — MVP vs Ideal checklist

Generated from the visual brand kit property matrix.

## Variant A — MVP via loader.js / \`__style__\`

Ship with today's TRC selectors only (CSS paint + existing mode overrides).

${mvp.map((p) => `- [ ] **${p.label}** (\`${p.tier}\`) — \`${p.tokenPath}\` → ${p.trcTargets?.length ? p.trcTargets.join(', ') : 'n/a'}\n  - ${p.abImplication}`).join('\n\n')}

## Variant B — Ideal subset (platform + soft)

Requires custom UI mode / new card fields and/or Gen AI brand-voice translation.

${ideal.map((p) => `- [ ] **${p.label}** (\`${p.tier}\`) — \`${p.tokenPath}\`\n  - ${p.abImplication}${p.notes ? `\n  - Note: ${p.notes}` : ''}`).join('\n\n')}

## Loader capability baseline

**Can do today:** inject CSS for \`.video-title\`, \`.branding\`, \`.tbl-feed-more-btn\`, \`.trc-pre-label\`, sponsored overlay, thumbnail radius, feed header accent.

**Cannot do without platform work:** new DOM fields (cook time, scores, alert windows), multi-badge inventories, section composition ("Mehr von…"), headline rewrite from brand voice.

## Gen AI

Soft-tier fields are hand-authored in ideal prototypes. Live enrichment is stubbed — see \`lib/enrich-stub.js\` and unmerged \`feat/deep-crawl-enrich-feed-mapping\`.
`;
}

module.exports = {
  buildMatrix,
  renderVisualBrandKitHtml,
  buildMvpChecklistMarkdown,
};
