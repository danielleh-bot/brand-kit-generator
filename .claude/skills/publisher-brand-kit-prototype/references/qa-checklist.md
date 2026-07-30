# QA checklist — publisher brand kit prototypes

Run every item before declaring the prototype done. Checkboxes are for the
agent's working notes / PR test plan.

## A. Input fidelity

- [ ] Prototype built from the provided kit path/JSON (not an older kit)
- [ ] Live article URL inspected this run; chrome notes captured
- [ ] Kit vs live contradictions resolved with provenance notes
- [ ] `html[lang]` matches `brand.language`

## B. Token coverage

- [ ] All `colors.*` roles used appropriately (not only primary)
- [ ] `fonts.primary` + `secondary` loaded; proxies documented if used
- [ ] Every present `type_scale` role has a matching CSS rule/class
- [ ] `buttons.primary` radius/padding/weight/transform match kit
- [ ] `photo_style` aspect + radius on hero and thumbs
- [ ] `layout_patterns.header` layers reflected in chrome
- [ ] `content_cards` radius/border/shadow match kit
- [ ] `content_cards.hover` / button hover implemented literally
- [ ] `brand_voice` labels appear as distinct treatments where applicable
- [ ] `navigation.navLinks` labels/order match kit or live site
- [ ] `taboola.*` labels used for section headers when present
- [ ] `spacing.card_gap` rhythm matches kit (tight vs airy)

## C. Structure

- [ ] Publisher-looking nav + correct logo treatment
- [ ] Realistic short article with hero image
- [ ] Feed below article (not a detached widget page)
- [ ] Card type inventory matches Composition Spec
- [ ] Sponsored vs organic distinction is clear
- [ ] Feed **interleaves** sponsored + organic (not organic-only; not all-organic-then-one-sponsored)
- [ ] Feed composition is **not** isomorphic to another `output/*/mobile-prototype.html`
- [ ] Mobile shell is high-fidelity iPhone mockup unless brief says bare/desktop

## D. Interaction / JS

- [ ] Hover/active states work on nav, cards, CTAs
- [ ] Any carousels/reels scroll correctly
- [ ] Live/breaking pulse animations only if kit/labels require them
- [ ] Sticky header behaves like the live mobile header

## E. Images & resilience

- [ ] No broken-image icons on load failure
- [ ] Fallback chain: primary → data-fallback → branded gradient container
- [ ] Remote images thematic to content (or inline SVG placeholders)

## F. Copy

- [ ] Zero em dashes (`—`) in visible text
- [ ] Headline case matches `brand_voice.headline_style`
- [ ] No lorem ipsum; article is on-topic for the URL/kit content

## G. Automated harness

```bash
SKILL_ROOT="${CLAUDE_SKILL_ROOT:-$HOME/.claude/skills/publisher-brand-kit-prototype}"
[ -d .claude/skills/publisher-brand-kit-prototype ] && SKILL_ROOT=".claude/skills/publisher-brand-kit-prototype"

python3 "$SKILL_ROOT/scripts/qa-prototype.py" \
  --kit output/<slug>/brand-kit.json \
  --html output/<slug>/mobile-prototype.html
```

- [ ] Script exits 0 (or failures fixed)
- [ ] Manual browser pass at target viewport
- [ ] Screenshots attached to PR when available (full page + feed)

## H. Shipping hygiene

- [ ] Files under `output/<slug>/` only (no drive-by edits to other pubs)
- [ ] README lists source URL, composition one-liner, open instructions
- [ ] PR test plan mirrors this checklist
