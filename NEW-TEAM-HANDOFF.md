# 🚀 New Team Handoff — Brand Kit Generator

Everything you need to spin up a fully-loaded Claude Code session in a new org/team in under 2 minutes.

---

## Step 1 — Create your environment

1. Go to **[claude.ai/code](https://claude.ai/code)** → switch to your new org/team
2. Click **New environment**
3. Connect the GitHub repo: **`danielleh-bot/brand-kit-generator`**
4. Re-authorize each integration below (OAuth is team-scoped, one click each):

| Integration | What it's used for |
|---|---|
| **GitHub** | Read/write PRs, branches, files, CI |
| **Atlassian** | Jira tickets + Confluence pages |
| **Slack** | Messaging, canvases, channel search |
| **Gmail** | Drafts, thread reading, labels |
| **Google Calendar** | Event management |
| **Google Drive** | File access and uploads |

> Full environment setup docs: https://code.claude.com/docs/en/claude-code-on-the-web

---

## Step 2 — Start a session and paste this prompt

> Copy everything inside the box below and paste it as your first message.

---

```
I'm continuing work on the Taboola Brand Kit Generator from a previous Claude Code session.
The repo has a CLAUDE.md with full context — please read it first, then confirm you're oriented.

Key facts to load immediately:

**Repo:** danielleh-bot/brand-kit-generator
**Active branch:** claude/wonderful-planck-zVP9Z
**My email:** danielle.h@taboola.com

**What this project is:**
A Taboola internal tool that crawls any publisher article URL with headless Chrome (Puppeteer),
extracts 50+ brand design tokens (colors, fonts, spacing, logos, layout), and generates:
- A branded Taboola feed prototype (index.html)
- A before/after analysis report (analysis-report.html)
- Exportable brand-kit.json and brand-kit.css

Two interfaces: a 5-step browser wizard (Express + SSE on port 4000) and a CLI.

**To run:**
npm install && npm run dev    # wizard at http://localhost:4000
node generate.js --url "https://example.com/article" --slug example   # CLI

**MCP tools available in this environment:**
- mcp__github__* → full GitHub access on danielleh-bot/brand-kit-generator
- mcp__Atlassian__* → Jira + Confluence
- mcp__Slack__* → Slack
- mcp__Gmail__* → Gmail
- mcp__Google_Calendar__* → Calendar
- mcp__Google_Drive__* → Drive
(Always load schemas via ToolSearch before calling any mcp__ tool)

**Git rules:**
- Always develop on: claude/wonderful-planck-zVP9Z
- Push: git push -u origin claude/wonderful-planck-zVP9Z
- No gh CLI — use mcp__github__* for all GitHub operations
- After pushing, create a draft PR if one doesn't exist

**Recent completed work:**
- #21 QA pass: favicon, dimensions, premature-complete banner, XSS, downloads
- #20 Fix invisible nav contrast, premature banner, wrong logo, cramped feed
- #19 Deeper extraction: real logo, multi-layer header, button tokens, honest banner
- #18 Hero image + 4-step wizard + auto-scroll + completed-state banner
- #17 Unsplash fallback before gradient placeholder

Please confirm you've read CLAUDE.md and are ready to continue.
```

---

## What happens automatically

Once the session starts with the prompt above, Claude Code will:

- ✅ Read `CLAUDE.md` from the repo root (auto-loaded on session start)
- ✅ Know the full project architecture, run commands, and file structure
- ✅ Know which branch to work on and how to push
- ✅ Know all MCP integrations and how to use them
- ✅ Have full recent work history as context
- ✅ Know your email / ownership of the project

**You will not need to explain anything.** Just describe what you want to do next.

---

## Quick reference — things Claude can do in this environment

| Task | How to ask |
|---|---|
| Run the wizard | "Start the dev server and check it loads" |
| Crawl a publisher | "Crawl bbc.com/news/some-article and generate the brand kit" |
| Fix a bug | Describe it — Claude reads the source directly |
| Create/review a PR | "Create a PR for the current changes" |
| Check Jira | "Find open tickets related to brand kit extraction" |
| Post to Slack | "Send a summary of today's work to #brand-kit channel" |
| Deploy to Render | "Help me deploy this to Render" |
| Watch a PR | "Watch PR #23 and autofix any CI failures" |
