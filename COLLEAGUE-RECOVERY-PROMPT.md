# Lost Everything in a Claude Org Move? Run This.

> Share this with any colleague who got moved to a new Claude team and lost their setup.  
> Works in **Claude Code**, **Claude.ai chat**, and **Claude Cowork**.  
> Just copy the prompt below and paste it as your first message.

---

## The Prompt

```
I just got moved to a new Claude org/team and I've lost my previous session context, 
memory, and setup. Help me recover and package everything so I'm fully operational again 
and can hand off context to future sessions. Work autonomously — don't ask me to do 
manual steps unless something is genuinely ambiguous.

## Step 1 — Recover what's still on this machine

Check what survived the org move by running these in order:

1. Read ~/.claude/CLAUDE.md — does it exist? If yes, summarize the rules inside it.
2. Run: ls ~/.claude/ — list everything there (settings, plugins, projects, memories).
3. Run: cat ~/.claude/settings.json 2>/dev/null || echo "NOT FOUND" — list any MCP servers or config.
4. Run: ls ~/.claude/plugins/ 2>/dev/null || echo "NOT FOUND" — list installed plugins.
5. Run: ls ~/.claude/projects/ 2>/dev/null || echo "NOT FOUND" — list any project memory folders.
6. Check for any local git repos: find ~/git ~/ -maxdepth 3 -name ".git" -type d 2>/dev/null | head -20
7. Check for any CLAUDE.md files in those repos: find ~/git ~/ -maxdepth 4 -name "CLAUDE.md" 2>/dev/null | head -20

Report everything you find. For each item that exists, note whether it looks healthy or broken.

## Step 2 — Reconstruct missing pieces

Based on what you found:
- If ~/.claude/CLAUDE.md is missing or empty, create a blank template I can fill in with my rules.
- If settings.json is missing MCP servers, tell me which ones to reconnect and how.
- If project memories are missing, check if any repos have CLAUDE.md files we can use as a substitute.

## Step 3 — Build my handoff package

Create two files for me:

### File 1: ~/MY-CLAUDE-SETUP.md
A personal setup doc capturing everything you found:
- What survived (rules, MCPs, plugins, memories)
- What needs to be reconnected or rebuilt
- My active repos and what each one does (from any CLAUDE.md or README files you find)
- A watch list of anything time-sensitive (expiring tokens, stale indexes, etc.)

### File 2: ~/MY-DAY1-PROMPT.md  
A self-contained Day 1 prompt I can paste into any new Claude session (Code, chat, or Cowork) 
that will:
- Run a self-check to verify my environment is healthy
- Load context about my active projects
- Re-enforce any rules that were in ~/.claude/CLAUDE.md
- End with "All systems go — ready when you are" only when everything passes,
  or diagnose and fix any failures before responding

## Step 4 — Summarise this session

Write a 1-page session summary covering:
- What we found, what was missing, what we rebuilt
- Current state of each active project (repo name, purpose, active branch, recent work)
- Any open todos or things I should follow up on
- The exact prompt to give a colleague who needs to help me pick up where I left off

When you're done, tell me the file paths for everything you created and give me the 
Day 1 prompt inline so I can copy it immediately.
```

---

## Tips for your colleagues

**Claude Code (CLI / web):**  
Paste the prompt as your first message after connecting a repo. Claude will explore your filesystem directly.

**Claude.ai chat:**  
Paste the prompt. Claude can't run shell commands directly, so it will ask you to paste outputs — just follow along, it'll guide you step by step.

**Claude Cowork:**  
Paste the prompt in a new session. If you have shared project context, ask Claude to read any CLAUDE.md files in your connected repos first.

**Pro tip:** Once Claude generates your `MY-DAY1-PROMPT.md`, commit it to your main repo so it's never lost again. That's the whole trick — keep your context in the repo, not in the session.
