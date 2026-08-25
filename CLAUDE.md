# Brand Kit Generator — Claude Code Context

## What this project is
Taboola internal tool that crawls any publisher article URL with headless Chrome (Puppeteer), extracts 50+ brand design tokens, and generates a branded Taboola feed prototype + analysis report. Two interfaces: a guided 5-step browser wizard (Express + SSE) and a CLI.

**Owner:** danielle.h@taboola.com  
**Repo:** danielleh-bot/brand-kit-generator  
**Active branch:** `claude/wonderful-planck-zVP9Z`

---

## Running the app

```bash
npm install
npm run dev        # wizard on http://localhost:4000
# OR
node generate.js --url "https://example.com/article" --slug example
```

Requires Chrome/Chromium on the system. In this cloud environment, check:
```bash
which chromium || which google-chrome || ls /usr/bin/chrom*
```

If missing: `sudo apt install chromium-browser`

---

## Project structure

```
server.js                  Express backend (SSE progress streaming)
generate.js                CLI entry point (commander)
wizard/
  index.html               5-step SPA
  wizard.css
  wizard.js
lib/
  crawler.js               Puppeteer extractor (7 extractors, getComputedStyle)
  defaults.js              Generic Taboola baseline for before/after comparison
  fonts.js                 Proprietary font → Google Fonts mapping table
  feed-content.js          Sponsored + native card generation
  unsplash.js              Curated photo bank + topic detector
  css-export.js            brand-kit.json → CSS custom properties
  analysis.js              Diff brand kit vs defaults → stats/gaps/workflow
  engine.js                Handlebars setup, partial registration, helpers
templates/
  prototype.hbs            Feed prototype template
  report.hbs               Analysis report template
  partials/                Handlebars partials
output/                    Generated per-publisher artifacts (gitignored)
```

---

## Key behaviours to know

- **Extraction quality check:** If <50% of tokens are real (not fallback), the CLI refuses to generate output unless `--accept-low-quality` is passed. Check `metadata.extraction_quality` in `brand-kit.json`.
- **Re-run without re-crawling:** `node generate.js --url _ --brand-kit ./output/<slug>/brand-kit.json --prototype-only`
- **Wizard session state:** Persisted to `localStorage`; recent crawls shown on landing step.
- **Port:** 4000. Server binds `0.0.0.0` by default (LAN accessible). Override: `HOST=127.0.0.1 npm run dev`
- **Output location:** `./output/<slug>/` — three files: `brand-kit.json`, `index.html`, `analysis-report.html`

---

## Deploy options

- **Render:** push to GitHub → New Blueprint → paste repo URL → uses `render.yaml` + `Dockerfile`
- **Fly.io:** `flyctl deploy` (uses `fly.toml` + `Dockerfile`)
- **Docker local:** `docker build -t brand-kit-wizard . && docker run -p 4000:4000 brand-kit-wizard`
- **Quick public tunnel:** `npx cloudflared tunnel --url http://localhost:4000`

Minimum 1 GB RAM (Chromium OOMs on 512 MB). Persistent volume at `/app/output` survives redeploys.

---

## MCP integrations in this environment

| Server prefix | What it covers |
|---|---|
| `mcp__github__*` | Full GitHub read/write on `danielleh-bot/brand-kit-generator` |
| `mcp__Atlassian__*` | Jira + Confluence |
| `mcp__Slack__*` | Slack channels, messages, canvases |
| `mcp__Gmail__*` | Gmail drafts, labels, threads |
| `mcp__Google_Calendar__*` | Calendar events |
| `mcp__Google_Drive__*` | Drive files |

Use `ToolSearch` to load any MCP tool schema before calling it.

---

## Git workflow

- Always develop on `claude/wonderful-planck-zVP9Z` unless told otherwise
- Push: `git push -u origin claude/wonderful-planck-zVP9Z`
- After pushing, create a draft PR if one doesn't exist (use `mcp__github__create_pull_request`)
- PRs target `main`

---

## Recent work (newest first)

- **#21** QA pass: favicon, dimensions, premature-complete banner, XSS hardening, downloads
- **#20** Fix invisible nav (contrast), premature banner, wrong logo, cramped feed
- **#19** Deeper extraction — real logo, multi-layer header, button tokens, honest banner, matched inputs
- **#18** Hero image fix + 4-step wizard + auto-scroll + completed-state banner
- **#17** Unsplash fallback before gradient placeholder

---

## Environment notes

- Cloud-hosted ephemeral container (Claude Code on the Web)
- Working directory: `/home/user/brand-kit-generator`
- Node 18+, Linux
- No `gh` CLI — use `mcp__github__*` tools for all GitHub operations
- Docs: https://code.claude.com/docs/en/claude-code-on-the-web
