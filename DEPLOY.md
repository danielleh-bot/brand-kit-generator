# Deploying the Brand Kit Wizard

The wizard needs Puppeteer + Chromium running on a real server. This repo
ships everything you need: a `Dockerfile` (Node 20 + Chromium), and
blueprints for Render and Fly.io. Pick whichever flow matches what you
already use.

> **Why not GitHub Pages / static hosting?** Because the crawl step
> launches a real headless browser. There is no way to run headless
> Chrome inside a static-only host.

---

## Option 1 — Render (recommended, deployable from your phone)

Render reads `render.yaml`, builds the Dockerfile, and gives you a
public `https://<name>.onrender.com` URL. The whole flow works from
mobile Safari.

1. Open [render.com](https://render.com) and sign in with GitHub.
2. Tap **New +** → **Blueprint**.
3. Paste this repo's URL: `https://github.com/danielleh-bot/brand-kit-generator`
4. Render reads `render.yaml`. Confirm the **Starter plan** ($7/mo —
   the free tier's 512 MB will OOM when Chromium loads a real article).
5. Tap **Apply**. The first build takes ~6–8 minutes (installing
   Chromium is the slow part). Once it goes green, open the assigned
   URL on your iPhone and start QA-ing.

To stop billing later: in Render → service → Settings → **Suspend**, or
**Delete** to remove it entirely.

---

## Option 2 — Fly.io (cheaper, requires `flyctl` on a desktop)

Fly is faster and ~$3/mo with auto-stop. Steps need a laptop because
`flyctl` is a CLI:

```bash
# 1. Install flyctl
brew install flyctl                # macOS
# or:    curl -L https://fly.io/install.sh | sh

# 2. Authenticate
flyctl auth login                  # opens a browser

# 3. From the repo root:
flyctl launch --copy-config --name brand-kit-wizard
# answer "No" to "Do you want to tweak these settings?"
# answer "Yes" to provisioning the persistent volume

# 4. Deploy
flyctl deploy
```

The URL prints at the end (`https://brand-kit-wizard.fly.dev`). Open it
on your phone.

To pause billing: `flyctl scale count 0`. To resume: `flyctl scale count 1`.

---

## Option 3 — Local Docker on any machine

For a private demo on a desktop you already have:

```bash
docker build -t brand-kit-wizard .
docker run --rm -p 4000:4000 -v "$PWD/output:/app/output" brand-kit-wizard
```

Open `http://<machine-ip>:4000` from any device on the same network.

For a public URL on top of that, expose it with Cloudflare's free
tunnel (no signup needed):

```bash
npx cloudflared tunnel --url http://localhost:4000
# prints a https://<random>.trycloudflare.com URL
```

---

## Sizing notes

Chromium is the constraint. Each crawl spawns a browser and holds it
open for ~5–10 seconds. The defaults assume:

- **Memory:** 1 GB minimum. 512 MB hosts will hit OOM partway through a
  crawl with no clear error in the log.
- **CPU:** one shared vCPU is fine for single-user QA. Bump to a
  dedicated CPU before letting multiple people use the same instance.
- **Disk:** 1 GB persistent volume mounted at `/app/output` so
  generated artifacts survive restarts. Without the mount you'll lose
  your "Recent crawls" list every redeploy.

## Environment variables

The Docker image reads these at startup:

| Variable      | Default              | Purpose |
|---------------|----------------------|---------|
| `PORT`        | `4000`               | HTTP listener |
| `HOST`        | `0.0.0.0`            | Set to `127.0.0.1` to bind localhost only |
| `CHROME_PATH` | `/usr/bin/chromium`  | Override if you swap the base image |
| `NODE_ENV`    | `production`         | Standard Node convention |
