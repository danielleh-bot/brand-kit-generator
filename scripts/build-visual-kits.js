#!/usr/bin/env node
/**
 * Build visual brand kits, property matrices, MVP checklists,
 * and ideal Before/After prototypes for A-B publishers + Lekker.
 *
 * Usage: node scripts/build-visual-kits.js
 */
const fs = require('fs');
const path = require('path');
const { enrichBrandKitStub } = require('../lib/enrich-stub');
const {
  buildMatrix,
  renderVisualBrandKitHtml,
  buildMvpChecklistMarkdown,
} = require('../lib/visual-brand-kit');
const { renderIdealPrototypeHtml } = require('../lib/ideal-prototype');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'output');

const PUBLISHERS = [
  { slug: 'leckerschmecker', idealFromExisting: true },
  { slug: 'business-insider' },
  { slug: 'fox-sports' },
  { slug: 'weather-channel' },
];

async function main() {
  const summary = [];

  for (const pub of PUBLISHERS) {
    const dir = path.join(OUTPUT, pub.slug);
    const kitPath = path.join(dir, 'brand-kit.json');
    if (!fs.existsSync(kitPath)) {
      console.warn(`skip ${pub.slug}: no brand-kit.json`);
      continue;
    }

    let brandKit = JSON.parse(fs.readFileSync(kitPath, 'utf8'));
    brandKit = await enrichBrandKitStub(brandKit, { noEnrich: true });

    const matrix = buildMatrix(pub.slug, brandKit);
    const matrixOut = { ...matrix };
    delete matrixOut._full;

    fs.mkdirSync(path.join(dir, 'visual-kit'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'property-matrix.json'), JSON.stringify(matrixOut, null, 2));
    fs.writeFileSync(path.join(dir, 'visual-brand-kit.html'), renderVisualBrandKitHtml(pub.slug, brandKit, matrix));
    fs.writeFileSync(path.join(dir, 'mvp-checklist.md'), buildMvpChecklistMarkdown(pub.slug, brandKit, matrix));

    // Persist enrichment stub metadata back onto kit (non-destructive stamp)
    fs.writeFileSync(kitPath, JSON.stringify(brandKit, null, 2) + '\n');

    if (!pub.idealFromExisting) {
      fs.writeFileSync(path.join(dir, 'feed-prototype.html'), renderIdealPrototypeHtml(pub.slug, brandKit));
    } else {
      // Ensure Lekker prototype links to visual kit — inject link if missing
      const protoPath = path.join(dir, 'feed-prototype.html');
      let html = fs.readFileSync(protoPath, 'utf8');
      if (!html.includes('visual-brand-kit.html')) {
        html = html.replace(
          '</div>\n\n<div class="split-view">',
          `<a href="./visual-brand-kit.html" style="color:#fff;font-size:11px;opacity:0.7;margin-left:12px">Visual brand kit ↗</a>
</div>

<div class="split-view">`
        );
        // fallback: after proto-bar closing if pattern differs
        if (!html.includes('visual-brand-kit.html')) {
          html = html.replace(
            /(<div class="proto-bar">[\s\S]*?)(<\/div>\s*<div class="split-view">)/,
            '$1  <a href="./visual-brand-kit.html" style="color:#fff;font-size:11px;opacity:0.7;margin-left:12px">Visual brand kit ↗</a>\n$2'
          );
        }
        fs.writeFileSync(protoPath, html);
      }
    }

    // README pointer (do not clobber hand-authored READMEs like BI workshop notes)
    const readmePath = path.join(dir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      const readme = `# ${brandKit.brand?.name || pub.slug} — Brand kit package

| Artifact | Purpose |
|---|---|
| \`brand-kit.json\` | Source of truth tokens |
| \`feed-prototype.html\` | Ideal native Before / Split / After feed |
| \`visual-brand-kit.html\` | **Unique vs Standard** — source visual → suggested feed → tier |
| \`property-matrix.json\` | Machine-readable tier matrix |
| \`mvp-checklist.md\` | Variant A (loader MVP) vs Variant B (ideal/platform) |

Open \`visual-brand-kit.html\` first for stakeholder review.
`;
      fs.writeFileSync(readmePath, readme);
    }

    summary.push({
      slug: pub.slug,
      brand: matrix.brand,
      mvpCoveragePct: matrix.mvpCoveragePct,
      counts: matrix.counts,
    });
    console.log(`✓ ${pub.slug} — MVP ${matrix.mvpCoveragePct}% ·`, matrix.counts);
  }

  // Roll-up docs
  const docsDir = path.join(ROOT, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const rollup = `# Feed integration matrix — Unique vs Standard

Visual brand kits are the primary artifact. Each publisher page shows
**source (publisher) → suggested application on today’s Taboola feed → integration tier**.

## Publishers

| Publisher | Visual kit | Ideal prototype | MVP coverage |
|---|---|---|---|
${summary
  .map(
    (s) =>
      `| ${s.brand} | [visual-brand-kit.html](../output/${s.slug}/visual-brand-kit.html) | [feed-prototype.html](../output/${s.slug}/feed-prototype.html) | ${s.mvpCoveragePct}% (${s.counts.standard} standard / ${s.counts.unique} unique / ${s.counts.soft} soft) |`
  )
  .join('\n')}

## Tiers

| Tier | Meaning | Ship path |
|---|---|---|
| **Standard / MVP** | Maps to existing TRC selectors | \`loader.js\` CSS + \`overrideConfig[mode].__style__\` |
| **Partial** | Knob exists, fidelity loss | Loader with compromise |
| **Unique / needs platform** | Ideal shows it; no card hook | Custom UI mode / Transformer work |
| **Soft / Gen AI** | Tone / copy / naming | Hand-authored in prototypes; \`lib/enrich-stub.js\` plug-point |

## Gen AI

Live enrichment is **not wired on main**. Soft properties are documented in the visual kit and stubbed via [\`lib/enrich-stub.js\`](../lib/enrich-stub.js). Full Claude pipeline exists on branch \`feat/deep-crawl-enrich-feed-mapping\`.

## Loader capability baseline

From the Business Insider production-shaped loader:

**Can paint today:** \`.video-title\`, \`.branding\`, \`.tbl-feed-more-btn\`, \`.trc-pre-label\`, sponsored overlay, thumbnail radius, feed header accent/dot.

**Cannot without platform:** cook time / scores / alert windows as card fields, multi-badge inventories, “Mehr von…” section composition, brand-voice headline rewrite.
`;
  fs.writeFileSync(path.join(docsDir, 'feed-integration-matrix.md'), rollup);

  // Index page
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Native Feed Brand Gaps — Index</title>
<style>
  body { font-family: DM Sans, system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #12141a; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  p { color: #5c6470; margin-bottom: 24px; }
  a.card { display: block; border: 1px solid #e4e7ec; border-radius: 12px; padding: 16px 18px; margin-bottom: 12px; text-decoration: none; color: inherit; }
  a.card:hover { border-color: #98a2b3; }
  .name { font-weight: 700; font-size: 16px; }
  .meta { font-size: 12px; color: #5c6470; margin-top: 4px; }
</style>
</head>
<body>
  <h1>Native Feed Brand Gaps</h1>
  <p>Ideal prototypes + visual Unique vs Standard brand kits for A-B publishers.</p>
  ${summary
    .map(
      (s) => `<a class="card" href="./${s.slug}/visual-brand-kit.html">
    <div class="name">${s.brand}</div>
    <div class="meta">MVP ${s.mvpCoveragePct}% · Visual kit · <span onclick="event.preventDefault()">open feed prototype via kit links</span></div>
  </a>`
    )
    .join('\n')}
  <p style="margin-top:24px;font-size:13px"><a href="../docs/feed-integration-matrix.md">docs/feed-integration-matrix.md</a></p>
</body>
</html>`;
  fs.writeFileSync(path.join(OUTPUT, 'index.html'), indexHtml);

  console.log('\nDone. Open output/<slug>/visual-brand-kit.html');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
