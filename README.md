# Brand Kit Generator

Automatically extracts brand design tokens (colors, typography, spacing, layout, brand voice, icons, photos) from any publisher website and generates Taboola feed prototypes + analysis reports.

## Two Modes

### 1. Node.js CLI (Recommended)
Uses Puppeteer to crawl the live page with headless Chrome, extracting 50+ design tokens via `getComputedStyle()`. Produces rich nested JSON, a branded feed prototype, and a before/after analysis report.

### 2. Browser-Based Tool
Open `index.html` for a 4-step interactive tool that fetches pages through CORS proxies. Good for quick demos, but limited in extraction depth.

## Quick Start — CLI

```bash
npm install
node generate.js --url "https://www.example.com/article-page" --slug example
```

Output in `./output/example/`:
- `brand-kit.json` — Rich nested design tokens (brand, logos, colors, fonts, brand_voice, photo_style, graphics, icons, layout_patterns)
- `index.html` — Publisher-branded Taboola feed prototype
- `analysis-report.html` — Before vs. after comparison report

### CLI Options

```
--url <url>         Required. Publisher article URL to crawl
--slug <slug>       Publisher slug for output dir (default: derived from domain)
--output <dir>      Output directory (default: ./output)
--report-only       Only generate analysis report
--prototype-only    Only generate feed prototype
--brand-kit <path>  Use existing brand-kit.json (skip crawl)
--chrome <path>     Path to Chrome/Chromium executable
--list              List previously generated publishers
```

### Examples

```bash
# Full generation
node generate.js --url "https://www.t-online.de/nachrichten/article" --slug t-online

# Re-generate from existing brand kit
node generate.js --url "https://example.com" --brand-kit ./output/t-online/brand-kit.json --slug t-online

# Report only
node generate.js --url "https://www.bbc.com/news/article" --report-only

# List generated publishers
node generate.js --url _ --list
```

## Project Structure

```
├── generate.js                 CLI entry point (commander)
├── lib/
│   ├── crawler.js              Puppeteer-based page crawler (7 extractors)
│   ├── defaults.js             Generic Taboola baseline for "before" comparison
│   ├── fonts.js                Proprietary font → Google Fonts mapping
│   ├── feed-content.js         Sponsored + native card generation
│   ├── analysis.js             Diff brand kit vs defaults → stats/gaps/workflow
│   └── engine.js               Handlebars setup, partial registration, helpers
├── templates/
│   ├── prototype.hbs           Feed prototype main template
│   ├── report.hbs              Analysis report main template
│   └── partials/
│       ├── proto-nav.hbs
│       ├── proto-hero.hbs
│       ├── proto-article.hbs
│       ├── proto-feed.hbs
│       ├── proto-footer.hbs
│       ├── report-header.hbs
│       ├── report-summary.hbs
│       ├── report-visual.hbs
│       ├── report-properties.hbs
│       ├── report-workflow.hbs
│       ├── report-ui-modes.hbs
│       ├── report-advantages.hbs
│       ├── report-gaps.hbs
│       ├── report-conclusion.hbs
│       └── components/
│           ├── stat-card.hbs
│           ├── status-tag.hbs
│           └── feed-card.hbs
├── output/                     Generated per-publisher output
├── index.html                  Browser-based tool (standalone)
├── css/styles.css
├── js/                         Browser JS modules
└── package.json
```

## Brand Kit JSON Schema

The generated `brand-kit.json` contains:

| Section | Contents |
|---------|----------|
| `brand` | name, tagline, website, description, language |
| `logos` | primary logo (SVG/text/image), favicon, variants |
| `colors` | primary + text (3 levels) + backgrounds (4) + accents |
| `fonts` | primary/secondary/tertiary + 10-role type_scale |
| `brand_voice` | language, headline patterns, content labels |
| `photo_style` | aspect ratio, border radius, video indicators |
| `graphics` | badges, labels, decorative elements |
| `icons` | SVG count, social media icons, style |
| `layout_patterns` | header layers, grid detection, card patterns |
| `metadata` | analysis date, source URL, method |

## Requirements

- Node.js 18+
- Chrome or Chromium installed on the system

## Browser-Based Tool

```bash
npm start
```

Open `index.html` in browser → Enter URL → Start Crawl → Review JSON → Preview Prototype → Download Report
