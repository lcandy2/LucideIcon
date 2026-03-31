---
name: SVG original/processed split
description: Two SVG versions per icon — original (24x24 canvas) and processed (tight viewBox)
type: project
---

Each icon has two SVG versions stored in `SVGs/`:
- `SVGs/original/` — Standard 24x24 canvas, matching upstream Lucide format. Used for web downloads and design tools.
- `SVGs/processed/` — Tight viewBox computed from path bounding boxes. Used as input for swiftdraw SF Symbol conversion.

**Why:** The original preserves the upstream canvas for compatibility. The processed version removes padding so swiftdraw generates correctly proportioned SF Symbols. Both share identical path elements — only the `<svg>` root attributes differ.

**How to apply:** `buildSVGPair()` returns both versions from the same element list. Only processed SVGs are fed to swiftdraw.
