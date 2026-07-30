# Anti-generic / anti-reskin rules

These rules exist because stakeholders rejected prototypes that were
"the last feed with new fonts/colors." Violating any rule = failed deliverable.

## Ban: reskin pipeline

**Forbidden workflow:**

1. Copy `output/<other-slug>/mobile-prototype.html`
2. Replace CSS variables / font links / logo text
3. Ship as the new publisher

**Required workflow:**

1. Inventory **this** kit
2. Inspect **this** live URL
3. Write a Composition Spec unique to this publisher
4. Hand-author HTML/CSS/JS for chrome + article + feed
5. QA token-by-token against **this** kit

You may *read* prior prototypes as references for quality bar and HTML
structure ideas. You may not diff-reduce them into the new file.

## Ban: one template to rule them all

| If you find yourself… | Stop and… |
|---|---|
| Reusing `pf-card-1x1` / `pf-row-2x1` / reels on a non-Premium brief | Re-read live feed pattern + kit `taboola.modes` |
| Reusing TWC `feed-card-h` horizontal row on a grid publisher | Match their actual mobile card geometry |
| Reusing BI black masthead + yellow accent on anyone else | Rebuild header from `layout_patterns.header` |
| Reusing AZ gold lock / teal opinion rails without Gannett labels | Only ship card types justified by **this** `brand_voice` |
| Naming classes `fox-*` or `twc-*` on another brand | Use a new publisher prefix |

## Ban: generic "AI card" hover

Default AI hover (`transform: translateY(-2px); box-shadow: …`) is banned
unless the kit's `content_cards.hover` explicitly describes lift/shadow.

Implement the kit's words:

- "headline color shifts to TWC Blue" → `color: var(--twc-blue)` on hover
- "red underline" → `border-bottom` / pseudo underline in accent red
- "subtle shadow lift" → modest shadow **and** whatever else is listed
- "none" / missing hover → keep interactions on CTAs/nav only

## Ban: token hallucination

Do not invent:

- Primary hex codes
- Font families
- Logo wordmarks / SVGs
- Nav labels
- Content label types (LIVE, SEVERE, Subscriber…)
- Card border-radius
- Button shapes (pills vs sharp)

If absent from kit **and** not observable on the live URL, omit the feature.
If present on the live URL but missing from kit, add it to the kit with
`source: "live-observed"` and a metadata note — then use it.

## Ban: fabricated provenance

- Do not claim `extraction_method: puppeteer` if you hand-built tokens.
- Do not claim a screenshot is "current live feed" unless captured this run.
- Do not reuse another publisher's article copy or related_articles.

## Ban: copy quality failures (historical QA regressions)

- No em dashes (`—`) in headlines or body — use commas, colons, periods.
- No broken image icons — always provide container-level gradient fallback.
- No lorem ipsum / "Sample Article Title".
- No invisible nav (light text on light masthead) — verify contrast.
- No class-prefix collisions across publishers in the same PR.

## Similarity test (must pass)

Open the new prototype next to one prior publisher prototype. If a reviewer
could believe they are the same layout with a theme swap, **fail** and
redesign the feed composition and chrome structure.
