---
name: HTML gallery
description: Searchable icon gallery at index.html, auto-generated during conversion
type: project
---

`index.html` at project root is a searchable icon gallery deployable via GitHub Pages.

**Features:** Instant search, responsive grid, click-to-copy icon name, 3 download options (SVG, Trimmed, SF Symbol).

**Generation:** Automatic Step 6 of `convert.mjs`. Icon list embedded as JSON in HTML.

**CI:** GitHub Actions commits the file alongside Symbols and Swift source. Deployed via the `static.yml` workflow.
