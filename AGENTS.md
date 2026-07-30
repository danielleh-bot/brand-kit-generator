# AGENTS.md

## Cursor Cloud specific instructions

Single Node.js product: the **Brand Kit Generator** (Taboola). It crawls a
publisher URL with headless Chrome (Puppeteer), extracts design tokens, and
generates branded feed prototypes + analysis reports into `./output/<slug>/`.
Two interfaces share the same core engine in `lib/`:

- **Wizard** (Express + vanilla SPA): `npm run dev` (alias for `node server.js`), serves on port `4000`.
- **CLI**: `node generate.js --url <url> --slug <slug>` (see `README.md` for flags).

There is **no lint, test, or build step** — `package.json` only defines
`start`/`dev`/`generate`. Validation is manual (run a crawl, open the generated
HTML). No database/cache/queue.

Non-obvious caveats:

- **Chrome is a system dependency.** `puppeteer-core` does NOT bundle Chromium.
  Both `server.js` and `generate.js` auto-detect a browser from a fixed list of
  paths; on this VM `/usr/bin/google-chrome-stable` is present and is picked up
  automatically, so `CHROME_PATH` does not need to be set. Confirm detection via
  `curl http://localhost:4000/api/health` → expect `{"ok":true,"chrome":true}`.
- Puppeteer is launched with `--no-sandbox` already (required in this container).
- Crawls need outbound internet access to the target publisher site, plus Google
  Fonts / Unsplash CDNs for the generated HTML to render faithfully.
- The server binds `0.0.0.0:4000`. Use `HOST=127.0.0.1` / `PORT=...` to override.
- Generated artifacts are written to `./output/<slug>/` and served at
  `/output/<slug>/index.html`. This dir is gitignored except the committed demo
  samples; do not commit new crawl output.
