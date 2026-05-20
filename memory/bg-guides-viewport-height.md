---
name: bg-guides-viewport-height
description: .bg-guides must stay 100vh, never 100% — long-page body height makes the `.horizontal-guide` and other hero-relative decorative elements scale off-target
metadata:
  type: project
---

`.bg-guides` is the wrapper for hero decorative elements (`.pattern-col`,
`.hero-arc`, `.horizontal-guide`, `.measure-badge`). Its height must be
`100vh`, **not** `100%`.

**Why:** `body { position: relative }` is set globally, so `.bg-guides`'
percentage height resolves to the *body* height. On long pages
(`index.html` ≈ 4000 px, `product.html` longer) `height: 100%` produces
~4000 px and `.horizontal-guide { top: 8% }` lands ~320 px down — far past
the hero, in the middle of the headline area. The orange 1 px guide line
and the 420 px badges then visibly dangle below the H1. User reported it as
"оранжевая линия перескакивает куда-то вниз" and the fix was changing
`.bg-guides { height: 100% }` → `height: 100vh` so the 8 % lands at the
top of the hero again (≈ 72 px at 900 px viewport).

**How to apply:** if you add new decorative children to `.bg-guides` keyed
off percentage offsets, they will land relative to the viewport now — keep
that in mind. If you ever need a *page-spanning* stripe (full-document)
do it via a separate element outside `.bg-guides` (see
[[test-viewport-814x903]] for a similar gotcha with side-padding formulas
on long pages).
