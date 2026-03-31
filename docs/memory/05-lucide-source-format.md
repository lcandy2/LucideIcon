---
name: Lucide source SVG format
description: How Lucide SVGs differ from UntitledUI and how the conversion handles them
type: project
---

Lucide icons are raw SVG files (not React components), stored in the `icons/` directory of the lucide-icons/lucide GitHub repo.

**SVG format:** 24x24 grid, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. All icons are stroke-based only (no fills or gradients).

**Key differences from UntitledUI pipeline:**
1. No React component parsing needed — SVGs are parsed directly via `parseSVGFile()`
2. `stroke="currentColor"` is skipped during parsing — root `stroke="black"` is applied instead for swiftdraw compatibility
3. Names are already kebab-case — no PascalCase-to-kebab conversion needed
4. Icons are downloaded via sparse git clone instead of npm pack

**How to apply:** The conversion script uses `git clone --depth 1 --sparse` to fetch only the `icons/` directory, then reads `.svg` files directly.
