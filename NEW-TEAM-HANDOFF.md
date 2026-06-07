# New Claude Org/Team — Complete Setup & Handoff Guide

> Everything you need to be fully operational in a new Claude team from scratch.  
> Read time: 2 min. Setup time: under 5 min.

---

## Part 1 — What carries over automatically (user-scoped, nothing to do)

| Component | Location | Notes |
|---|---|---|
| Global rules (Ada ban, revenue pipeline) | `~/.claude/CLAUDE.md` | Persists across orgs |
| MCP servers (sage, datahub, feature-catalog) | `~/.claude/settings.json` | Persists across orgs |
| Plugins (datastore, code-truth, coo-analytics, telemetry) | `~/.claude/plugins/` | v2026.05.12 |
| code-truth index | `~/.cache/code-truth/index.sqlite` | 417,828 records |
| Project memory (16 files) | `~/.claude/projects/.../memory/` | Persists across orgs |
| DataHub token | `~/.claude/settings.json` | Expires **2026-08-10** — see Watch List |

**Org-provisioned MCPs** (Slack, Calendar, Drive, Gmail, GitHub, Atlassian) reappear automatically once the new org is provisioned — nothing to do.

---

## Part 2 — One-time environment setup (new team only)

1. Go to **[claude.ai/code](https://claude.ai/code)** → switch to your new org/team
2. Click **New environment** → connect repo: **`danielleh-bot/brand-kit-generator`**
3. If any OAuth integrations don't auto-provision, reconnect them:

| Integration | Used for |
|---|---|
| GitHub | PRs, branches, CI, file access |
| Atlassian | Jira + Confluence |
| Slack | Messaging, canvases, search |
| Gmail | Drafts, threads, labels |
| Google Calendar | Events |
| Google Drive | Files |

> Docs: https://code.claude.com/docs/en/claude-code-on-the-web

---

## Part 3 — Day 1 Prompt (copy, paste, done)

> Paste this as your **very first message** in the new session. It self-checks your entire environment, loads project context, and gets Claude fully oriented before you say another word.

---

```
Before we do anything, run a full self-check. Confirm ✅ or flag ❌ and fix autonomously — do not ask me to do manual steps.

## System checks

1. Read ~/.claude/CLAUDE.md — confirm the Ada ban rule and revenue pipeline rule are present
2. Run: sqlite3 ~/.cache/code-truth/index.sqlite 'SELECT COUNT(*) FROM records' — confirm > 0
3. Run: cat ~/.claude/plugins/installed_plugins.json | python3 -c "import json,sys; d=json.load(sys.stdin); [print(k) for k in d['plugins']]" — confirm datastore, code-truth, coo-analytics appear
4. Run: python3 -c "import json; d=json.load(open('/Users/danielle.h/.claude/settings.json')); [print(k) for k in d.get('mcpServers',{})]" — confirm sage, datahub, feature-catalog appear
5. Read ~/.claude/projects/-Users-danielle-h-git-publisher-product-analysts-repo/memory/MEMORY.md — confirm it loads

## Project context

6. Read CLAUDE.md in the current repo (brand-kit-generator) — confirm you understand the project

## Key facts

- Repo: danielleh-bot/brand-kit-generator
- Active branch: claude/wonderful-planck-zVP9Z
- Owner: danielle.h@taboola.com
- Project: Taboola tool that crawls publisher URLs with headless Chrome, extracts brand design tokens, generates a feed prototype + analysis report. Wizard at port 4000 (npm run dev) or CLI (node generate.js).
- No gh CLI — use mcp__github__* for all GitHub operations (load schemas via ToolSearch first)
- After pushing, always create a draft PR if one doesn't exist
- MCP tools available: mcp__github__*, mcp__Atlassian__*, mcp__Slack__*, mcp__Gmail__*, mcp__Google_Calendar__*, mcp__Google_Drive__*

## Hard rules in effect (from ~/.claude/CLAUDE.md)

- Ada is HARD BANNED. Never call mcp__ada__chat or the ada skill. Route instead:
  SQL → datastore skill | Confluence → mcp__atlassian__* | DataHub → mcp__datahub__* | Metrics → coo-analytics | Features → mcp__feature-catalog__*
- Never fabricate dollar figures. Every revenue/RPM/ExTAC/margin number must come from a datastore SQL query or coo-analytics, with SQL + result cited. Unverified = "TBD — datastore query required"
- Genie experiments: table genie_experiment_summary_daily, control = experiment_variant_id = -2, always filter -2 arm to publisher_id IN (test publishers)

If all checks pass, reply "All systems go — ready when you are."
If anything fails, diagnose and fix it before replying.
```

---

## Part 4 — Rules reference (always active)

These live in `~/.claude/CLAUDE.md` and apply in every session automatically.

### Ada ban
Never call `mcp__ada__chat` or the `ada` skill. Route instead:
- SQL queries → `datastore` skill
- Confluence/wiki → `mcp__atlassian__*` directly
- DataHub lineage → `mcp__datahub__*` directly
- Business metrics → `coo-analytics` skill family
- Feature context → `mcp__feature-catalog__*` directly

### No fabricated numbers
Every revenue / RPM / ExTAC / margin figure must come from a `datastore` SQL query or `coo-analytics`, with the SQL and result cited inline. Flag anything unverified as `TBD — datastore query required`.

### Genie experiment conventions
- Table: `genie_experiment_summary_daily` joined on `experiment_variant_id`
- Control cohort: `experiment_variant_id = -2`
- Always filter the `-2` arm to `publisher_id IN (test publishers)` — never compare unfiltered

---

## Part 5 — Watch list

| Item | Date | Action |
|---|---|---|
| DataHub PAT expiry | **2026-08-10** | Regenerate at `datahub.taboolasyndication.com` → run `/update-config` to write new token |
| code-truth index freshness | Check if repos changed significantly | Re-run indexer via `code-truth` skill |

---

## Part 6 — Brand Kit Generator quick reference

| Task | Command / ask |
|---|---|
| Run wizard | `npm run dev` → http://localhost:4000 |
| Run CLI | `node generate.js --url "https://..." --slug name` |
| Regen prototype only | `node generate.js --url _ --brand-kit ./output/<slug>/brand-kit.json --prototype-only` |
| List past crawls | `node generate.js --url _ --list` |
| Deploy (Render) | Push to GitHub → New Blueprint → paste repo URL |
| Deploy (Fly.io) | `flyctl deploy` |
| Quick public URL | `npx cloudflared tunnel --url http://localhost:4000` |

**Recent work (newest first):**
- `#21` QA pass: favicon, dimensions, premature-complete banner, XSS, downloads
- `#20` Fix invisible nav contrast, premature banner, wrong logo, cramped feed
- `#19` Deeper extraction: real logo, multi-layer header, button tokens, honest banner
- `#18` Hero image + 4-step wizard + auto-scroll + completed-state banner
- `#17` Unsplash fallback before gradient placeholder
