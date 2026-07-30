# Claude Code — brand-kit generator

## Publisher brand-kit → feed prototype skill

Project skill (preferred) and slash command:

- Skill: `.claude/skills/publisher-brand-kit-prototype/SKILL.md`
- Command: `.claude/commands/publisher-brand-kit-prototype.md`
- Invoke: `/publisher-brand-kit-prototype <path-to-brand-kit.json> <article-url>`

### Install / refresh global Claude Code copy

```bash
mkdir -p ~/.claude/skills ~/.claude/commands
cp -a .claude/skills/publisher-brand-kit-prototype ~/.claude/skills/
cp -a .claude/commands/publisher-brand-kit-prototype.md ~/.claude/commands/
```

Claude Code discovers project-local `.claude/skills` and `.claude/commands` automatically when you open this repo. The copy above is for global use outside the repo.

### Hard rules from production feedback

1. **Interleave sponsored + organic** in Taboola / Recommended feeds (never organic-only).
2. **Default mobile shell = high-fidelity iPhone mockup.** Prefer Claude Design MCP when connected (`claude mcp add --scope user --transport http claude-design https://api.anthropic.com/v1/design/mcp` then `/design-login`); else HTML/CSS device chrome.
3. Follow every phase in the skill; run `scripts/qa-prototype.py` before shipping.

### Example (OK! Magazine)

```text
/publisher-brand-kit-prototype output/ok-magazine/brand-kit.json https://www.ok.co.uk/tv/love-island-finalist-reveals-sad-37458508
```

Deliverable: `output/<slug>/mobile-prototype.html`
