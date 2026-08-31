# Brand Kit Generator

Automatically extracts brand design tokens (colors, typography, spacing, layout, brand voice, icons, photos) from any publisher website and generates Taboola feed prototypes + analysis reports.


## Base schema + live CP diff

Crawls still write `brand-kit.json` in the current crawl shape (templates depend on it). They also write `publisher-brand-kit.base@1.1.0` as `brand-kit.base.json`. Analysis diffs that base kit against live CP selectors — not generic Arial defaults. Unique grammar belongs in `editorial_grammar` / `requires_new_client_properties`, never new top-level keys.

```bash
npm run verify
```

## Two ways to run it

### 1. Wizard (recommended for humans)

Guided 5-step browser experience: crawl a publisher, preview the extracted brand kit, export it as **JSON or drop-in CSS**, optionally re-render the prototype against a different article URL, and preview/share the final HTML.

```bash
npm install
npm run dev
# open http://localhost:4000
```

The wizard talks to a tiny Express backend (`server.js`) that runs the same Puppeteer extractor as the CLI and streams live progress over Server-Sent Events. All artifacts land in `./output/<slug>/` as self-contained files — exactly what you'd upload to Nexus.

The UI is fully responsive — open it on your phone over Wi-Fi or via a tunnel:

```bash
# 1) On your laptop, in the same Wi-Fi: the server already binds to 0.0.0.0.
#    Look for the "Network: http://192.168.x.x:4000" line in the start-up log
#    and open that URL on your phone.

# 2) Share over the internet via Cloudflare's free tunnel (no signup needed):
npx cloudflared tunnel --url http://localhost:4000
# prints a https://<random>.trycloudflare.com URL you can hand anyone

# Or restrict back to localhost only:
HOST=127.0.0.1 npm run dev
```

### 2. CLI (recommended for automation)

```bash
npm install
node generate.js --url "https://www.example.com/article-page" --slug example
```

Output in `./output/example/`:
- `brand-kit.json` — rich nested design tokens
- `brand-kit.css` — drop-in CSS (`:root` custom properties + utility classes)
- `index.html` — publisher-branded Taboola feed prototype
- `analysis-report.html` — before vs. after comparison report

#### CLI Options

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

## Project Structure

```
├── server.js                   Express backend for the wizard (SSE progress)
├── generate.js                 CLI entry point (commander)
├── wizard/                     Modern SPA — vanilla HTML/CSS/JS
│   ├── index.html
│   ├── wizard.css
│   └── wizard.js
├── lib/
│   ├── crawler.js              Puppeteer-based page crawler (7 extractors)
│   ├── defaults.js             Generic Taboola baseline for "before" comparison
│   ├── fonts.js                Proprietary font → Google Fonts mapping
│   ├── feed-content.js         Sponsored + native card generation
│   ├── unsplash.js             Curated photo bank + topic detector
│   ├── css-export.js           brand-kit.json → brand-kit.css
│   ├── analysis.js             Diff brand kit vs defaults → stats/gaps/workflow
│   └── engine.js               Handlebars setup, partial registration, helpers
├── templates/                  Handlebars templates for prototype + report
└── output/                     Generated per-publisher artifacts
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
| `metadata` | analysis date, source URL, extraction quality |

## Deploy it

Want a public URL you can hand teammates? See [`DEPLOY.md`](./DEPLOY.md).
The repo includes:

- `Dockerfile` — Node 20 + system Chromium, ready to push to any container host.
- `render.yaml` — one-click [Render](https://render.com) blueprint (deployable from a phone).
- `fly.toml` — [Fly.io](https://fly.io) config (deployable via `flyctl deploy`).

## Requirements

- Node.js 18+
- Chrome or Chromium installed on the system (or set `CHROME_PATH=/path/to/chrome`)
