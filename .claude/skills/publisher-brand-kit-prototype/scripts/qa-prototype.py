#!/usr/bin/env python3
"""Structural + token QA for publisher brand-kit HTML prototypes.

Usage:
  python3 qa-prototype.py --kit output/<slug>/brand-kit.json \\
                          --html output/<slug>/mobile-prototype.html

Exits 0 on pass, 1 on failures. Designed for the publisher-brand-kit-prototype skill.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


def dig(obj: Any, path: str, default: Any = None) -> Any:
    cur = obj
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return default
        cur = cur[part]
    return cur


def collect_hexes(kit: dict) -> set[str]:
    hexes: set[str] = set()

    def walk(o: Any) -> None:
        if isinstance(o, dict):
            for k, v in o.items():
                if k in {"hex", "background_color", "text_color", "color", "accent_rule_color",
                         "hover_background", "indicator_color"} and isinstance(v, str):
                    m = re.search(r"#(?:[0-9a-fA-F]{3,8})", v)
                    if m:
                        hexes.add(m.group(0).lower())
                walk(v)
        elif isinstance(o, list):
            for i in o:
                walk(i)

    for section in ("colors", "buttons", "layout_patterns", "logos", "photo_style"):
        walk(kit.get(section, {}))
    return hexes


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--kit", required=True, type=Path)
    ap.add_argument("--html", required=True, type=Path)
    ap.add_argument("--min-hex-hit-rate", type=float, default=0.45,
                    help="Fraction of kit hex tokens that must appear in HTML/CSS")
    args = ap.parse_args()

    failures: list[str] = []
    warnings: list[str] = []

    if not args.kit.exists():
        print(f"FAIL: kit not found: {args.kit}")
        return 1
    if not args.html.exists():
        print(f"FAIL: html not found: {args.html}")
        return 1

    kit = json.loads(args.kit.read_text(encoding="utf-8"))
    html = args.html.read_text(encoding="utf-8")
    html_l = html.lower()

    brand_name = dig(kit, "brand.name")
    if brand_name and brand_name.split()[0].lower() not in html_l:
        # allow short forms; warn only if no token of name appears
        tokens = [t for t in re.split(r"\W+", brand_name) if len(t) > 2]
        if tokens and not any(t.lower() in html_l for t in tokens):
            failures.append(f"brand.name '{brand_name}' not reflected in HTML")

    # Em dashes in user-visible copy (ignore HTML comments + CSS comments)
    stripped = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    stripped = re.sub(r"/\*.*?\*/", "", stripped, flags=re.S)
    # Titles may use em dashes; focus on body copy / card headlines
    body_only = re.sub(r"<head\b[^>]*>.*?</head>", "", stripped, flags=re.I | re.S)
    em_hits = re.findall(r">[^<]*—[^<]*<", body_only)
    if em_hits:
        sample = em_hits[0][:80].replace("\n", " ")
        failures.append(
            f"em dash (—) in visible copy (e.g. {sample}) — replace with , : or ."
        )

    # Font families
    for role in ("primary", "secondary"):
        family = dig(kit, f"fonts.{role}.family")
        equiv = dig(kit, f"fonts.{role}.google_equivalent")
        if not family:
            continue
        candidates = [family]
        if equiv:
            candidates.append(equiv)
        if not any(c.lower() in html_l for c in candidates):
            failures.append(
                f"fonts.{role}.family '{family}' (or google_equivalent) not found in HTML"
            )

    # Primary color
    primary = dig(kit, "colors.primary.hex")
    if primary and primary.lower() not in html_l:
        failures.append(f"colors.primary.hex {primary} missing from HTML/CSS")

    # Header bg
    header_bg = dig(kit, "layout_patterns.header.background_color")
    if header_bg and header_bg.lower() not in html_l:
        failures.append(
            f"layout_patterns.header.background_color {header_bg} missing from HTML/CSS"
        )

    # Card radius — accept either content_cards or spacing key
    radius = dig(kit, "layout_patterns.content_cards.border_radius") or dig(
        kit, "spacing.card_border_radius"
    )
    if radius is not None:
        # normalize 0px / 0
        variants = {str(radius).lower(), str(radius).lower().replace(" ", "")}
        if str(radius) in ("0", "0px"):
            variants.update({"0px", "0", "border-radius: 0", "border-radius:0"})
        if not any(v in html_l for v in variants):
            # soft fail for Premium overrides that intentionally differ — warn
            warnings.append(
                f"card border_radius '{radius}' from kit not obviously present "
                f"(OK only if Composition Spec intentionally overrides for Premium)"
            )

    # Photo aspect
    aspect = dig(kit, "photo_style.thumbnail_format.aspect_ratio")
    if aspect:
        # 16:9 → 16/9 or 16 / 9 or "16/9"
        norm = aspect.replace(":", "/")
        if norm not in html and aspect not in html and f"aspect-ratio: {norm}" not in html_l:
            if "aspect-ratio" not in html_l:
                failures.append(
                    f"photo_style aspect_ratio {aspect} not applied (no aspect-ratio in CSS)"
                )
            else:
                warnings.append(
                    f"photo_style aspect_ratio {aspect} not found literally — verify manually"
                )

    # Nav links
    nav = dig(kit, "navigation.navLinks") or []
    if isinstance(nav, list) and nav:
        missing_nav = []
        for item in nav[:8]:
            text = item.get("text") if isinstance(item, dict) else None
            if text and text.lower() not in html_l:
                missing_nav.append(text)
        if len(missing_nav) > max(1, len(nav[:8]) // 2):
            failures.append(
                f"most navigation.navLinks missing from HTML: {missing_nav[:5]}"
            )
        elif missing_nav:
            warnings.append(f"some nav links missing: {missing_nav[:5]}")

    # Taboola labels
    for key in ("feed_label", "sponsored_label"):
        label = dig(kit, f"taboola.{key}")
        if label and label.lower() not in html_l:
            warnings.append(f"taboola.{key} '{label}' not found in HTML")

    # Content headline
    headline = dig(kit, "content.headline") or dig(kit, "content.title")
    if headline:
        # allow minor punctuation drift — check a stable substring
        snippet = headline[:32].lower()
        if snippet not in html_l:
            warnings.append("content.headline from kit not found — ensure article is real")

    # Hex hit rate
    hexes = collect_hexes(kit)
    if hexes:
        hits = sum(1 for h in hexes if h in html_l)
        rate = hits / len(hexes)
        print(f"Hex token coverage: {hits}/{len(hexes)} ({rate:.0%})")
        if rate < args.min_hex_hit_rate:
            failures.append(
                f"hex hit rate {rate:.0%} < required {args.min_hex_hit_rate:.0%} "
                f"— prototype likely not applying the kit"
            )

    # Anti-reskin smell: foreign class prefixes from known pubs
    brand_l = (brand_name or "").lower()
    foreign = []
    for prefix, owner in (("fox-", "fox"), ("twc-", "weather"), ("pf-card", "fox premium")):
        if prefix in html_l:
            if owner == "fox" and "fox" not in brand_l:
                foreign.append(prefix)
            if owner == "weather" and "weather" not in brand_l:
                foreign.append(prefix)
            if owner == "fox premium" and "fox" not in brand_l:
                foreign.append(prefix)
    if foreign:
        failures.append(
            f"foreign class prefixes {foreign} suggest a reskin of another publisher"
        )

    # Must look like a page with header + article + feed
    for needle, label in (
        ("<header", "header/chrome"),
        ("<article", "article"),
    ):
        if needle not in html_l and label == "article" and "article-" not in html_l:
            warnings.append(f"no {label} landmark — verify article block exists")
    if not any(x in html_l for x in ("feed", "sponsored", "taboola", "premium-feed")):
        failures.append("no feed/sponsored/taboola markers found in HTML")

    # Report
    for w in warnings:
        print(f"WARN: {w}")
    for f in failures:
        print(f"FAIL: {f}")

    if failures:
        print(f"\nQA FAILED — {len(failures)} failure(s), {len(warnings)} warning(s)")
        return 1

    print(f"\nQA PASSED — {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
