---
name: Overrides system
description: Custom SVG icons in Overrides/ that replace or extend upstream Lucide icons
type: project
---

The `Overrides/` directory contains custom SVG icons that replace or extend upstream Lucide icons without being affected by upstream updates.

**Pipeline integration:** Runs as Step 1.5 in `convert.mjs`, after reading upstream SVGs but before conversion.

**SVG format requirements:**
- `viewBox="0 0 24 24"`, `width="24" height="24"`
- Use `stroke="black"` and `stroke-width="2"`
- `stroke-linecap="round"` and `stroke-linejoin="round"`

**Naming:** kebab-case filenames (e.g., `heart.filled.svg`). Matching names replace upstream icons; new names add as new icons.
