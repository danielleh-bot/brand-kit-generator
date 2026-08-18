#!/usr/bin/env node
/**
 * One shareable page holding all four Mediahuis mockups side by side, so the
 * pitch can go out as a link instead of four email attachments.
 *
 * Each mockup is embedded live (scrollable) via srcdoc rather than as a
 * screenshot — reviewers can scroll the feed themselves.
 *
 * Written as an Artifact-ready fragment: no <!doctype>/<html>/<head>/<body>,
 * those are added at publish time. It still opens fine as a local file.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MOCKS = [
  { slug: 'crime-world', name: 'Crime World', mode: 'light', id: '1641788',
    note: 'Dark masthead over a white page, subscriber chip in the kicker row, podcast strip mid-article — the furniture the site leads with today.' },
  { slug: 'crime-world', name: 'Crime World', mode: 'dark', id: '1641788',
    note: 'The brand’s natural register. Accent lifts to #FF2D3F so the red still carries against near-black.' },
  { slug: 'belfast-telegraph', name: 'Belfast Telegraph', mode: 'light', id: '1284555',
    note: 'Serif masthead, section rail with accent underline, area breadcrumb — the Derry/Londonderry news template.' },
  { slug: 'belfast-telegraph', name: 'Belfast Telegraph', mode: 'dark', id: '1284555',
    note: 'Same template on a dark ground; body serif holds its weight and the feed separators stay hairline.' },
];

const escAttr = (s) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cards = MOCKS.map((m) => {
  const file = path.join(ROOT, 'output', m.slug, `mobile-prototype-${m.mode}.html`);
  // Mark the copy as embedded so it drops its own caption/controls (CSS-only).
  const html = fs
    .readFileSync(file, 'utf8')
    .replace('<html lang="en"', '<html lang="en" class="embedded"');
  return `      <figure class="mock">
        <figcaption class="mock-head">
          <span class="mock-title">${m.name}</span>
          <span class="chip chip-${m.mode}">${m.mode === 'dark' ? 'Dark' : 'Light'} mode</span>
        </figcaption>
        <div class="screen-wrap">
          <iframe class="screen" title="${m.name} ${m.mode} mode prototype" loading="lazy" srcdoc="${escAttr(html)}"></iframe>
        </div>
        <p class="mock-note">${m.note}</p>
        <p class="mock-meta">Publisher ID ${m.id} · scroll the frame to reach the feed</p>
      </figure>`;
}).join('\n');

const page = `<title>Mediahuis True Native</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>
  :root {
    --ground: #EDEFF2;
    --surface: #FFFFFF;
    --surface-sunk: #E4E8EC;
    --ink: #14181C;
    --ink-soft: #4E575F;
    --ink-faint: #737D86;
    --rule: #D6DCE1;
    --accent: #10606E;
    --accent-quiet: #DDECEE;
    --serif: "Newsreader", Georgia, serif;
    --sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    --measure: 62ch;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #0B0E11;
      --surface: #13181D;
      --surface-sunk: #0F1418;
      --ink: #E8EDF1;
      --ink-soft: #A2ACB5;
      --ink-faint: #7C868F;
      --rule: #222A31;
      --accent: #63C6D6;
      --accent-quiet: #122C32;
    }
  }
  :root[data-theme="dark"] {
    --ground: #0B0E11;
    --surface: #13181D;
    --surface-sunk: #0F1418;
    --ink: #E8EDF1;
    --ink-soft: #A2ACB5;
    --ink-faint: #7C868F;
    --rule: #222A31;
    --accent: #63C6D6;
    --accent-quiet: #122C32;
  }

  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  .page {
    max-width: 1140px;
    margin: 0 auto;
    padding: clamp(28px, 5vw, 64px) clamp(18px, 4vw, 40px) 72px;
    display: flex;
    flex-direction: column;
    gap: clamp(32px, 5vw, 52px);
  }

  .eyebrow {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 14px;
  }
  h1 {
    font-family: var(--serif);
    font-size: clamp(30px, 4.6vw, 46px);
    line-height: 1.1;
    font-weight: 500;
    letter-spacing: -0.02em;
    margin: 0 0 16px;
    text-wrap: balance;
  }
  .lede {
    font-family: var(--serif);
    font-size: clamp(17px, 2vw, 19.5px);
    line-height: 1.55;
    color: var(--ink-soft);
    max-width: var(--measure);
    margin: 0;
  }

  .facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
    gap: 1px;
    background: var(--rule);
    border: 1px solid var(--rule);
    border-radius: 2px;
    overflow: hidden;
  }
  .fact { background: var(--surface); padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
  .fact dt {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .fact dd {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }

  h2 {
    font-family: var(--serif);
    font-size: clamp(21px, 2.6vw, 26px);
    font-weight: 500;
    letter-spacing: -0.012em;
    margin: 0 0 6px;
  }
  .section-note { margin: 0; color: var(--ink-soft); max-width: var(--measure); }

  .gallery {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(22px, 3vw, 34px);
  }
  .mock {
    margin: 0;
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 3px;
    padding: 16px 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .mock-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .mock-title { font-family: var(--serif); font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
  .chip {
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 2px;
    border: 1px solid var(--rule);
    color: var(--ink-soft);
    white-space: nowrap;
  }
  .chip-dark { background: var(--surface-sunk); }
  .chip-light { background: var(--accent-quiet); color: var(--accent); border-color: transparent; }

  /* The mock is authored at 393px; scale it to whatever width the column gives. */
  .screen-wrap {
    --scale: 0.78;
    width: 100%;
    height: calc(872px * var(--scale));
    overflow: hidden;
    background: var(--surface-sunk);
    border-radius: 2px;
    display: flex;
    justify-content: center;
  }
  .screen {
    width: 425px;
    height: 872px;
    border: 0;
    flex: 0 0 auto;
    transform: scale(var(--scale));
    transform-origin: top center;
  }
  @media (max-width: 760px) {
    .gallery { grid-template-columns: minmax(0, 1fr); }
    .screen-wrap { --scale: 0.72; }
  }

  .mock-note { margin: 0; font-size: 14.5px; line-height: 1.5; color: var(--ink-soft); }
  .mock-meta {
    margin: 0;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--ink-faint);
  }

  .points { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-top: 18px; }
  .point { border-top: 2px solid var(--accent); padding-top: 12px; }
  .point h3 { font-family: var(--sans); font-size: 14px; font-weight: 600; margin: 0 0 6px; letter-spacing: 0.005em; }
  .point p { margin: 0; font-size: 14.5px; line-height: 1.5; color: var(--ink-soft); }

  .disclosure {
    background: var(--surface);
    border: 1px solid var(--rule);
    border-left: 3px solid var(--accent);
    border-radius: 2px;
    padding: 20px 22px;
  }
  .disclosure h2 { margin-bottom: 10px; }
  .disclosure p { max-width: var(--measure); color: var(--ink-soft); margin: 0 0 10px; }
  .disclosure p:last-child { margin-bottom: 0; }
  .disclosure strong { color: var(--ink); font-weight: 600; }

  footer.colophon {
    border-top: 1px solid var(--rule);
    padding-top: 18px;
    font-family: var(--mono);
    font-size: 11.5px;
    letter-spacing: 0.04em;
    color: var(--ink-faint);
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
  }
  a { color: var(--accent); }
  a:focus-visible, iframe:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>

<div class="page">
  <header>
    <p class="eyebrow">Taboola · Mediahuis Ireland</p>
    <h1>True Native, in the site as it looks today</h1>
    <p class="lede">
      Mediahuis' note on the first round was that the surrounding page didn't match their
      current sites, so the feed read as something sitting on top of the article rather than
      part of it. These four rebuild Crime World and Belfast Telegraph on the article template
      both titles run now — same masthead, section rail, kicker and body setting — with the
      Taboola feed picking up each brand's own tokens.
    </p>
  </header>

  <dl class="facts">
    <div class="fact"><dt>Titles</dt><dd>Crime World · Belfast Telegraph</dd></div>
    <div class="fact"><dt>Mockups</dt><dd>4 — light and dark each</dd></div>
    <div class="fact"><dt>Placement</dt><dd>Below article, end of body</dd></div>
    <div class="fact"><dt>Proposed test</dt><dd>10% of traffic · 2–3 weeks</dd></div>
  </dl>

  <section>
    <h2>The four mockups</h2>
    <p class="section-note">Each frame is live — scroll inside it to move from the article into the feed.</p>
    <div class="gallery">
${cards}
    </div>
  </section>

  <section>
    <h2>What to look at</h2>
    <p class="section-note">Three things carry the pitch when this goes in front of management.</p>
    <div class="points">
      <div class="point">
        <h3>The feed inherits the template</h3>
        <p>Both titles run the same Mediahuis article platform, so the feed module is built from the
        same rules as the page it sits in — accent bar and serif module heading, hairline separators,
        the publisher's own type scale. No widget skin.</p>
      </div>
      <div class="point">
        <h3>Sponsored and organic are the same shape</h3>
        <p>Cards share geometry, image ratio and type scale. The only difference is the label slot:
        "Sponsored · advertiser" and a disclosure icon where an organic card carries its section
        kicker. Disclosure stays clear without breaking the page.</p>
      </div>
      <div class="point">
        <h3>Dark mode is designed, not inverted</h3>
        <p>Each brand gets its own dark palette, with the red lifted so it still carries against a
        near-black ground and separators kept hairline rather than heavy.</p>
      </div>
    </div>
  </section>

  <section class="disclosure">
    <h2>Before this goes to Mediahuis</h2>
    <p>
      These were built without network access to <strong>belfasttelegraph.co.uk</strong> or
      <strong>crimeworld.com</strong>, so the live pages couldn't be crawled for exact design tokens.
    </p>
    <p>
      <strong>Grounded:</strong> article headlines, standfirsts and body facts from the two sample
      pages; section names; publisher IDs; Crime World's subscription model; the shared article
      template structure.
    </p>
    <p>
      <strong>Approximated:</strong> exact brand hex values, masthead lettering, nav item order and
      hero crop ratios. All four pages are generated from one token block, so a screenshot of each
      live article in both modes is enough to true them up quickly.
    </p>
    <p>
      Advertiser names in the sponsored cards are placeholders and imply no existing relationship;
      imagery is abstract rather than photography of the real events.
    </p>
  </section>

  <footer class="colophon">
    <span>Crime World 1641788</span>
    <span>Belfast Telegraph 1284555</span>
    <span>Prototypes for discussion — not production markup</span>
  </footer>
</div>
`;

const out = path.join(ROOT, 'output', 'mediahuis-true-native-gallery.html');
fs.writeFileSync(out, page, 'utf8');
console.log('wrote ' + path.relative(ROOT, out) + ' (' + Math.round(page.length / 1024) + ' KB)');
