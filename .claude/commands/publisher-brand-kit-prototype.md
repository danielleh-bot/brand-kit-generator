---
description: Build a publisher-native HTML feed prototype from brand-kit JSON + article URL (Claude workflow entry point for the publisher-brand-kit-prototype skill).
argument-hint: [path-to-brand-kit.json] [publisher-article-url]
---

# Publisher brand-kit feed prototype

You are running the **publisher-brand-kit-prototype** Claude skill / workflow.

## Inputs

- Brand kit: `$ARGUMENTS` may include a path to `brand-kit.json` and/or a publisher article URL. If either is missing, ask for it before designing.
- Typical call: `/publisher-brand-kit-prototype output/espn/brand-kit.json https://www.espn.com/...`

## Instructions

1. **Load and follow every phase** in `.claude/skills/publisher-brand-kit-prototype/SKILL.md` without skipping.
2. Load supporting refs as needed:
   - `.claude/skills/publisher-brand-kit-prototype/references/token-application-matrix.md`
   - `.claude/skills/publisher-brand-kit-prototype/references/anti-generic-rules.md`
   - `.claude/skills/publisher-brand-kit-prototype/references/qa-checklist.md`
   - `.claude/skills/publisher-brand-kit-prototype/references/publisher-composition-examples.md`
3. Deliver `output/<slug>/mobile-prototype.html` (or desktop `index.html` when the brief requires it).
4. Run QA before finishing:

```bash
python3 .claude/skills/publisher-brand-kit-prototype/scripts/qa-prototype.py \
  --kit output/<slug>/brand-kit.json \
  --html output/<slug>/mobile-prototype.html
```

## Hard rules

- Do **not** copy another publisher's prototype and only change fonts/colors.
- Apply **all** kit entities (CSS, hover, JS, labels, photo, layout) — not palette-only.
- Prototype must look like **this** publisher's site: nav, logo, short article + hero, then a native feed designed for their UX.
- No hallucinations: prefer kit + live URL observation; patch kit with provenance when live CSS contradicts it.
