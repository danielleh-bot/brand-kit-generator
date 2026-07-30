#!/usr/bin/env python3
"""Validate a publisher-brand-kit.base@1.0.0 JSON file.

Ensures required feed mappings exist and rejects legacy conflict fields.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

FORBIDDEN_TOP = {
    # Overloaded / duplicated legacy roots
}
FORBIDDEN_PATHS = {
    "colors.primary",
    "colors.secondary",
    "colors.primary_variants",
    "colors.accents",
    "colors.top_bg_colors",
    "colors.top_text_colors",
    "colors.top_link_colors",
    "colors.text",
    "colors.backgrounds",
    "fonts.primary",
    "fonts.secondary",
    "fonts.tertiary",
    "fonts.type_scale",
    "fonts.all_fonts",
    "buttons",
    "brand_voice",
    "photo_style",
    "graphics",
    "icons",
    "layout_patterns",
    "spacing",
    "taboola",
    "navigation",
    "content",
    "header",
}

REQUIRED_PATHS = [
    "brand.name",
    "chrome.header.background",
    "colors.page_background",
    "colors.feed_well",
    "colors.card_surface",
    "colors.text_headline",
    "colors.text_meta",
    "colors.feed_accent",
    "typography.headline.family",
    "typography.body.family",
    "typography.card_title.size",
    "typography.feed_section_label.size",
    "typography.headline_case",
    "card.border_radius",
    "card.thumbnail.aspect_ratio",
    "card.thumbnail.border_radius",
    "card.gap",
    "cta.sponsored.background",
    "cta.sponsored.border_radius",
    "feed.composition",
    "feed.labels.organic",
    "feed.labels.sponsored",
]

COMPOSITION_ENUM = {
    "horizontal-thumb",
    "stacked-full",
    "grid",
    "premium-mixed",
}


def dig(obj, path: str):
    cur = obj
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("kit", type=Path)
    ap.add_argument(
        "--allow-null-required",
        action="store_true",
        help="Only check structure/forbidden fields (template smoke test)",
    )
    args = ap.parse_args()

    kit = json.loads(args.kit.read_text(encoding="utf-8"))
    failures: list[str] = []
    warnings: list[str] = []

    schema = dig(kit, "metadata.schema") or kit.get("$schema_name")
    if schema and "publisher-brand-kit.base" not in str(schema) and not args.allow_null_required:
        warnings.append(f"metadata.schema is {schema!r} — expected publisher-brand-kit.base@…")

    for path in FORBIDDEN_PATHS:
        if dig(kit, path) is not None or (path in kit):
            # top-level key check
            top = path.split(".")[0]
            if top in kit and path == top:
                failures.append(f"forbidden legacy field present: {path}")
            elif dig(kit, path) is not None:
                failures.append(f"forbidden legacy field present: {path}")

    # Also catch top-level legacy keys
    for key in (
        "buttons",
        "brand_voice",
        "photo_style",
        "graphics",
        "icons",
        "layout_patterns",
        "spacing",
        "taboola",
        "navigation",
        "content",
        "header",
        "fonts",
    ):
        if key in kit:
            failures.append(f"forbidden legacy top-level key: {key}")

    if "colors" in kit and isinstance(kit["colors"], dict):
        for bad in (
            "primary",
            "secondary",
            "primary_variants",
            "accents",
            "text",
            "backgrounds",
            "top_bg_colors",
            "top_text_colors",
            "top_link_colors",
        ):
            if bad in kit["colors"]:
                failures.append(f"forbidden colors.{bad} — use role-named colors.* fields")

    for path in REQUIRED_PATHS:
        val = dig(kit, path)
        if val is None or val == "" or val == []:
            if args.allow_null_required:
                continue
            failures.append(f"required mapping empty: {path}")

    composition = dig(kit, "feed.composition")
    if composition and composition not in COMPOSITION_ENUM:
        failures.append(
            f"feed.composition {composition!r} not in {sorted(COMPOSITION_ENUM)}"
        )

    # One-mapping sanity: CTA background must not equal header unless intentional note
    cta_bg = dig(kit, "cta.sponsored.background")
    header_bg = dig(kit, "chrome.header.background")
    if cta_bg and header_bg and cta_bg == header_bg:
        warnings.append(
            "cta.sponsored.background == chrome.header.background — verify this is intentional"
        )

    # Badge styles referenced by enabled must exist
    enabled = dig(kit, "badges.enabled") or []
    styles = dig(kit, "badges.styles") or {}
    if isinstance(enabled, list):
        for bid in enabled:
            if bid not in styles:
                failures.append(f"badges.enabled contains {bid!r} but badges.styles.{bid} missing")
            else:
                style = styles[bid] or {}
                bg, fg = style.get("background"), style.get("text_color")
                if bg and fg and bg == fg:
                    failures.append(f"badges.styles.{bid} has identical background/text_color")

    hover = dig(kit, "card.hover") or {}
    if isinstance(hover, dict) and hover.get("translate_y") and not any(
        hover.get(k) for k in ("surface_background", "headline_color", "headline_underline_color", "shadow")
    ):
        warnings.append("card.hover.translate_y set without other hover channels — avoid generic lift-only")

    for w in warnings:
        print(f"WARN: {w}")
    for f in failures:
        print(f"FAIL: {f}")

    if failures:
        print(f"\nINVALID — {len(failures)} failure(s), {len(warnings)} warning(s)")
        return 1
    print(f"\nVALID base kit — {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
