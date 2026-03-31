---
name: Naming conventions
description: How Lucide icon names map between file names, asset identifiers, and Swift properties
type: project
---

Lucide icons use kebab-case names (e.g., `arrow-down`, `alarm-clock-check`).

**Name mappings:**
- File name: kebab-case (`arrow-down.svg`)
- Asset identifier: kebab-case (`arrow-down`)
- Swift property: underscores (`arrow_down`)

**Implementation:** `toSwiftName()` converts hyphens and dots to underscores. `escapeIfKeyword()` wraps Swift keywords in backticks.

**Variants:** If using dot notation for variants (e.g., `heart.filled`), both `-` and `.` are converted to `_` in Swift property names.
