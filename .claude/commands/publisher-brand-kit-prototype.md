---
description: Build a publisher-native HTML feed prototype from brand-kit JSON + article URL (Claude workflow entry point for the publisher-brand-kit-prototype skill).
argument-hint: [path-to-brand-kit.json] [publisher-article-url]
---

# Publisher brand-kit feed prototype

You are running the **publisher-brand-kit-prototype** Claude skill / workflow (global install).

## Skill location

Prefer project-local if present, else the global install:

- Project: `.claude/skills/publisher-brand-kit-prototype/`
- Global: `~/.claude/skills/publisher-brand-kit-prototype/`

## Inputs

- Brand kit: `$ARGUMENTS` may include a path to `brand-kit.json` and/or a publisher article URL. If either is missing, ask for it before designing.
- Typical call: `/publisher-brand-kit-prototype output/espn/brand-kit.json https://www.espn.com/...`

## Instructions

1. **Load and follow every phase** in the skill `SKILL.md` without skipping.
2. Load supporting refs as needed from the skill's `references/` folder:
   - `feed-field-mapping.md`
   - `token-application-matrix.md`
   - `anti-generic-rules.md`
   - `qa-checklist.md`
   - `publisher-composition-examples.md`
3. Deliver `output/<slug>/mobile-prototype.html` (or desktop `index.html` when the brief requires it).
4. Run QA before finishing (use whichever skill root you loaded):

```bash
SKILL_ROOT="${CLAUDE_SKILL_ROOT:-$HOME/.claude/skills/publisher-brand-kit-prototype}"
# if project has the skill, prefer it:
[ -d .claude/skills/publisher-brand-kit-prototype ] && SKILL_ROOT=".claude/skills/publisher-brand-kit-prototype"

python3 "$SKILL_ROOT/scripts/qa-prototype.py" \
  --kit output/<slug>/brand-kit.json \
  --html output/<slug>/mobile-prototype.html
```

## Hard rules

- Do **not** copy another publisher's prototype and only change fonts/colors.
- Apply **all** kit entities (CSS, hover, JS, labels, photo, layout) — not palette-only.
- Prototype must look like **this** publisher's site: nav, logo, short article + hero, then a native feed designed for their UX.
- No hallucinations: prefer kit + live URL observation; patch kit with provenance when live CSS contradicts it.
- **Sponsored mix:** Taboola / Recommended feeds must interleave sponsored + organic cards (never organic-only).
- **iPhone fidelity:** default mobile deliverable is a realistic iPhone mockup. Prefer Claude Design MCP when connected; else high-fidelity HTML/CSS device chrome.
