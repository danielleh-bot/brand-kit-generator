# How to Run the Brand Kit Generator

A step-by-step guide to extracting brand design tokens from any publisher
website and producing a Taboola feed prototype + analysis report.

This guide covers both ways to run the tool:

1. **CLI mode** (Node.js + headless Chrome) — the recommended path. Deeper
   extraction, richer output, repeatable.
2. **Browser mode** (open `index.html` in a browser) — quicker, no install,
   but limited by CORS proxies.

If you just want the fastest happy path, jump to
[The 60-second quick start](#the-60-second-quick-start).

---

## Table of contents

- [What the tool does](#what-the-tool-does)
- [What you need before you start](#what-you-need-before-you-start)
- [The 60-second quick start](#the-60-second-quick-start)
- [Installation in detail](#installation-in-detail)
- [Running the CLI](#running-the-cli)
  - [Basic command](#basic-command)
  - [All CLI options explained](#all-cli-options-explained)
  - [Common recipes](#common-recipes)
- [Understanding the output](#understanding-the-output)
- [Running the browser-based tool](#running-the-browser-based-tool)
- [Choosing a good URL to crawl](#choosing-a-good-url-to-crawl)
- [Reading the extraction quality warning](#reading-the-extraction-quality-warning)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## What the tool does

You give it a publisher article URL (e.g. an article on `t-online.de`,
`bbc.com`, `lemonde.fr`). It will:

1. Open the page in a real headless Chrome instance.
2. Scrape **50+ design tokens** via `getComputedStyle()` — colours, fonts,
   spacing, logos, icon style, photo style, brand voice cues, layout
   patterns.
3. Save those tokens as a structured `brand-kit.json` file.
4. Render a **branded Taboola feed prototype** (`index.html`) that mimics
   the publisher's visual identity, with native cards built from real
   articles found on the page.
5. Render an **analysis report** (`analysis-report.html`) comparing the
   publisher's brand against the generic Taboola baseline — gaps,
   advantages, workflow recommendations.

Everything lands in `./output/<publisher-slug>/`.

---

## What you need before you start

| Requirement | Notes |
|---|---|
| **Node.js 18 or newer** | Check with `node --version`. |
| **Chrome or Chromium** | The CLI uses `puppeteer-core`, which expects a Chrome binary already on your system. It does **not** auto-download one. |
| **A reachable article URL** | Use a specific article page, not the homepage. Articles are richer in design tokens (typography, photo style, body text, headlines). |
| **Network access** | Some sites block headless browsers; see [Troubleshooting](#troubleshooting). |

To check whether Chrome is detectable, the CLI looks in these paths in order:

- Linux: `/usr/bin/google-chrome`, `/usr/bin/google-chrome-stable`,
  `/usr/bin/chromium`, `/usr/bin/chromium-browser`, `/snap/bin/chromium`
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
  `/Applications/Chromium.app/Contents/MacOS/Chromium`
- Windows (via WSL): `/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`
  and the `(x86)` variant

If your Chrome is somewhere else, pass `--chrome /path/to/chrome` and the
tool will use that directly.

Install hints if you don't have Chrome:

```bash
# Ubuntu / Debian
sudo apt install chromium-browser

# macOS
brew install --cask chromium

# Fedora
sudo dnf install chromium
```

---

## The 60-second quick start

From the project root:

```bash
npm install
node generate.js --url "https://www.bbc.com/news/articles/some-article-id" --slug bbc
```

When it finishes, open the two HTML files in your browser:

```bash
open output/bbc/index.html              # macOS
xdg-open output/bbc/index.html          # Linux
start output/bbc/index.html             # Windows
```

That's the whole loop. Read on for the explanation, options, and how to
recover when things look weird.

---

## Installation in detail

1. **Clone the repo** (if you haven't already) and `cd` into it:

   ```bash
   git clone <your-fork-or-this-repo>
   cd brand-kit-generator
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

   This installs three packages:
   - `commander` — CLI argument parsing
   - `handlebars` — template engine for the prototype and report
   - `puppeteer-core` — headless Chrome driver (no bundled Chromium)

3. **(Optional) Make the CLI globally available** by linking the bin:

   ```bash
   npm link
   brand-kit --url "https://example.com/article"
   ```

   Otherwise just call `node generate.js ...` from the repo root.

---

## Running the CLI

### Basic command

```bash
node generate.js --url "<article-url>" --slug <name>
```

- `--url` is the only **required** flag. It must be the full URL of an
  article page on the publisher you want to analyse.
- `--slug` is optional. If you omit it, the tool derives one from the
  hostname (e.g. `https://www.t-online.de/...` becomes `t-online-de`). The
  slug determines the output subdirectory (`./output/<slug>/`).

Example:

```bash
node generate.js \
  --url "https://www.t-online.de/nachrichten/deutschland/example-article.html" \
  --slug t-online
```

You'll see progress logs:

```
🔍 Brand Kit Generator v2.0
   URL:    https://www.t-online.de/...
   Slug:   t-online
   Output: /home/you/brand-kit-generator/output/t-online

🌐 Launching browser (chromium)...
   Navigating to page...
   Extracting brand kit...
   ✓ Brand kit extracted
   Extracting article content...
   ✓ Content extracted
   Extracting navigation...
   ✓ Navigation extracted
   Extracting related articles for feed...
   ✓ 12 related articles extracted

📋 Brand kit saved: output/t-online/brand-kit.json
🎨 Generating feed prototype...
   ✓ Prototype saved: output/t-online/index.html
📊 Generating analysis report...
   ✓ Report saved: output/t-online/analysis-report.html

✅ Done! Output files in: output/t-online
```

A clean run typically takes **15–45 seconds** depending on the publisher's
page weight and your network.

### All CLI options explained

| Flag | Required? | What it does |
|---|---|---|
| `--url <url>` | Yes | Article URL to crawl. Quote it if it contains `&` or `?`. |
| `--slug <slug>` | No | Output folder name under `./output/`. Defaults to a hostname-derived slug. |
| `--output <dir>` | No | Override the base output directory. Defaults to `./output`. |
| `--report-only` | No | Skip the prototype; only produce `analysis-report.html`. |
| `--prototype-only` | No | Skip the report; only produce `index.html`. |
| `--brand-kit <path>` | No | Reuse an existing `brand-kit.json` instead of re-crawling. Fast iteration on templates. |
| `--chrome <path>` | No | Point at a specific Chrome binary if auto-detection fails. |
| `--accept-low-quality` | No | Override the safety check that refuses to generate output from a brand kit with >50% fallback tokens. |
| `--list` | No | List publishers already generated under `./output/`. No crawl happens. |
| `-V`, `--version` | No | Print the CLI version. |
| `-h`, `--help` | No | Print help text and exit. |

### Common recipes

**Crawl a publisher, full output:**

```bash
node generate.js --url "https://www.lemonde.fr/article" --slug le-monde
```

**Regenerate only the analysis report from a kit you already crawled** (no
network, no Chrome — very fast):

```bash
node generate.js \
  --url _ \
  --slug le-monde \
  --brand-kit ./output/le-monde/brand-kit.json \
  --report-only
```

> Note: `--url` is required by the CLI parser even when `--brand-kit` makes
> it logically unused. Pass any placeholder like `_`.

**Generate only the prototype** (when you're iterating on
`templates/prototype.hbs` or `templates/partials/proto-*.hbs`):

```bash
node generate.js \
  --url _ \
  --slug le-monde \
  --brand-kit ./output/le-monde/brand-kit.json \
  --prototype-only
```

**Send output somewhere other than `./output/`:**

```bash
node generate.js \
  --url "https://example.com/article" \
  --slug example \
  --output ~/Desktop/brand-experiments
```

**Use a Chrome that isn't in the auto-detect list:**

```bash
node generate.js \
  --url "https://example.com/article" \
  --chrome "/opt/google/chrome/google-chrome"
```

**See what you've generated so far:**

```bash
node generate.js --url _ --list
```

---

## Understanding the output

Every run drops three files into `./output/<slug>/`:

```
output/<slug>/
├── brand-kit.json          ← raw extracted design tokens
├── index.html              ← Taboola feed prototype (publisher-branded)
└── analysis-report.html    ← before/after comparison report
```

### `brand-kit.json`

A structured JSON document with these top-level sections (see the README
for the full schema):

| Section | What's in it |
|---|---|
| `brand` | name, tagline, website, description, language |
| `logos` | primary logo (SVG / text / image URL), favicon, variants |
| `colors` | primary + 3 levels of text + 4 backgrounds + accents |
| `fonts` | primary / secondary / tertiary + a 10-role type scale |
| `brand_voice` | language, headline patterns, content labels |
| `photo_style` | aspect ratio, border radius, video indicators |
| `graphics` | badges, labels, decorative elements |
| `icons` | SVG count, social icons, style |
| `layout_patterns` | header layers, grid detection, card patterns |
| `metadata` | analysis date, source URL, method, **extraction_quality** |

`metadata.extraction_quality` is the most important field for debugging —
it tells you how many tokens were genuinely extracted vs. filled from
fallback defaults. See [Reading the extraction quality warning](#reading-the-extraction-quality-warning).

You can hand-edit this JSON and re-run with `--brand-kit` if you want to
tweak a colour or override a font before regenerating the prototype.

### `index.html` (feed prototype)

Open it directly in a browser. It's a fully self-contained HTML page —
fonts are loaded from Google Fonts, styling is inlined or in `<style>`
blocks — so you can email it, drop it in a Slack thread, or zip it up for
a client.

The feed cards are populated from real "related articles" found on the
crawled page when possible. If the article didn't expose enough related
content, the cards are padded with synthetic placeholders and you'll see
a warning during the crawl (see [Troubleshooting](#troubleshooting)).

### `analysis-report.html` (analysis report)

A multi-section report showing:

- Summary stat cards (tokens extracted, gap count, etc.)
- Visual before/after comparison
- Properties side-by-side (publisher brand vs. generic Taboola defaults)
- Workflow recommendations
- Identified advantages and gaps
- A conclusion section

Useful for stakeholder conversations and design reviews.

---

## Running the browser-based tool

If you can't install Node, or just want a quick visual demo:

1. Start a local static server from the repo root (any will do; this is
   what `npm start` wraps):

   ```bash
   npm start
   # or:
   npx serve .
   ```

2. Open the printed URL (usually `http://localhost:3000`) in your browser
   and load `index.html`.

3. Walk the 4-step stepper UI:
   - **Step 1 — Crawl Publisher.** Paste the publisher homepage URL, the
     article URL, and a name. Click **Start Crawl**. Fetching goes
     through a CORS proxy, so some sites will fail here that work fine
     with the CLI.
   - **Step 2 — Brand Kit JSON.** Review the extracted JSON; edit if you
     like.
   - **Step 3 — Feed Prototype.** Preview the branded feed.
   - **Step 4 — Analysis Report.** See the before/after report, with an
     option to download.

The browser tool is **good for demos and quick exploration** but
**limited**: it can't execute pages in a real renderer, so it sees the
raw HTML the proxy returns rather than the fully-styled DOM. For accurate
results, always prefer the CLI.

---

## Choosing a good URL to crawl

Quality of extraction depends heavily on the page you point at.

**Do:**
- Use a **full article page**, not the homepage. Articles expose body
  typography, byline styling, photo treatments, captions, share buttons,
  related-content widgets — exactly what the extractor wants.
- Pick an article that is **long-form** with images, not a stub or a
  paywalled stub.
- Use **`https://`** and the canonical hostname (no AMP, no
  `m.example.com` mobile variants — those are often stripped-down).

**Avoid:**
- Login walls or hard paywalls — the crawler can't authenticate.
- AMP pages — they share little styling with the real site.
- Sites that aggressively block automation (e.g. Cloudflare bot-fight
  mode pages). You'll get a near-empty extraction with all fallbacks.

If you want a richer set of feed cards, you can also crawl the homepage
once and copy the `brand-kit.json` over — the layout-pattern extractor
benefits from the variety on a homepage.

---

## Reading the extraction quality warning

After the crawl, the CLI prints a summary like:

```
⚠️  Extraction quality is low: only 14/52 brand tokens were actually
pulled from the page. The rest are fallbacks.
```

This means the page didn't yield enough real signal. Common causes:

1. **The site detected headless Chrome and blocked it.** Some publishers
   serve a different page (a captcha, an interstitial, or a stripped
   landing page) to automated user agents.
2. **Content is rendered client-side** after `networkidle2` fires.
   Single-page apps may still be hydrating when the extractor runs.
3. **Selectors don't match.** The crawler uses heuristics; if a
   publisher has unusual markup, the heuristics miss.

To investigate, open the produced `brand-kit.json` and look at
`metadata.extraction_quality.fallback_tokens` — it lists exactly which
tokens were not extracted.

If you intentionally want to proceed with a low-quality kit (e.g. to
verify the templates render at all), pass `--accept-low-quality`. The
default behaviour is to refuse, so you don't accidentally ship a
"polished" report built from synthetic defaults.

You may also see a related-articles warning:

```
⚠️  Only found 2 related articles — feed will be padded with
synthetic placeholders.
```

This is independent from token extraction. It just means the page didn't
expose a "related" or "popular" widget the crawler could read. Try
pointing at the publisher's homepage instead, then re-run the
prototype-only step with `--brand-kit` reusing the original kit.

---

## Troubleshooting

**"Chrome/Chromium not found."**
Install one of the supported browsers (see
[What you need before you start](#what-you-need-before-you-start)), or
pass `--chrome /absolute/path/to/binary`. On WSL, point at the Windows
Chrome under `/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`.

**`ERR_CONNECTION_REFUSED` or `net::ERR_*`.**
The URL is unreachable or actively blocking automation. Try:
- Open the URL in a normal browser to confirm it loads at all.
- Use a different article on the same publisher.
- Run from a different network (some sites geo-block).

**Timeout after 60 seconds during "Navigating to page…".**
The page is too slow to reach `networkidle2`. Causes: heavy ads,
analytics never going idle, slow CDN. Options:
- Retry on a faster connection.
- Pick a lighter article on the same publisher.

**Page loads but the prototype looks all-grey and generic.**
Extraction quality is probably low. Check the
`metadata.extraction_quality` block in `brand-kit.json` and the warning
printed at the end of the crawl. See
[the extraction-quality section](#reading-the-extraction-quality-warning).

**`Error: Cannot find module 'puppeteer-core'` (or similar).**
You forgot `npm install`. Run it from the repo root.

**Fonts in the prototype don't match the publisher.**
The crawler maps proprietary fonts to the closest Google Font via
`lib/fonts.js`. If a font isn't in the mapping table, you'll get a
generic fallback. You can override by editing `brand-kit.json` and
running with `--brand-kit --prototype-only`.

**`No publishers generated yet.`** from `--list`.
There's nothing under `./output/`. Run a full generation first.

**Permission errors writing to `./output/`.**
Either choose a writable directory with `--output ~/somewhere/writable`,
or check that you own the project directory.

---

## FAQ

**Can I use this on any publisher?**
Yes — that's the point. It has no per-publisher hardcoding. Some sites
will block automation; see Troubleshooting.

**Do I need a Taboola login or API key?**
No. Everything runs locally against the public page.

**Will it work on paywalled articles?**
Only the public preview portion. Hard paywalls return a stripped page,
which yields a poor brand kit.

**Can I tweak the colours or fonts before regenerating?**
Yes. Edit `output/<slug>/brand-kit.json` and re-run with
`--brand-kit <path> --prototype-only`. No re-crawl needed.

**Can I run it in CI?**
Yes. Use `--chrome` to point at a CI-installed Chrome, and consider
caching `node_modules`. Be aware that some publishers block CI IP
ranges.

**How big is the output?**
Each run is typically under 500 KB total — three small files. Safe to
commit if you want to track changes over time, but they're generated
artifacts so most workflows keep them out of git.

**Where do I look first if something seems off?**
1. The terminal warnings at the end of the crawl.
2. `metadata.extraction_quality` in `brand-kit.json`.
3. Open the prototype `index.html` in a browser with dev tools open.

---

That's everything. If you've followed the
[quick start](#the-60-second-quick-start) and you can open the prototype
in your browser, you're done.
