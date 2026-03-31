---
name: ViewBox aspect ratio fix
description: Why processed SVGs must have width/height matching viewBox dimensions for swiftdraw
type: project
---

Processed SVGs must set `width` and `height` to match the tight viewBox dimensions.

**Why:** swiftdraw maps SVG viewBox directly into the SF Symbol grid. If width/height are hardcoded to 24x24 but the viewBox is a different aspect ratio (e.g., 16x2), swiftdraw stretches the icon to fill the 24x24 square, causing distortion.

**How to apply:** In `buildSVGPair()`, the processed SVG always sets `width="${vbW}" height="${vbH}"` where vbW/vbH are computed from the bounding box. The original SVG retains the standard 24x24 canvas.
