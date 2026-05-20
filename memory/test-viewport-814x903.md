---
name: test-viewport-814x903
description: User's standard test viewport for this site — 814×903 (between the 768 and 1024 breakpoints, where pattern-col is hidden but desktop reservations still apply)
metadata:
  type: user
---

When checking responsive correctness for this site, use **814 × 903** as a
default viewport alongside whatever else you screenshot. That's the user's
own DevTools setup (responsive mode, 50 % zoom). It sits between the site's
two main breakpoints (`768 < vw ≤ 1024`), where bugs hide: `.pattern-col`
is already `display:none` at that range but layout formulas that reserve
horizontal space for those strips still apply.

**Why:** the user reviews the site at this size and flagged the trusted-by
ticker squeezing to ~270 px there. Root cause: `.trusted-by` had
`max-width: min(90rem, calc(100vw - 34rem))` — 34rem reserved for the
side pattern-cols + arc. At 814 px that leaves only ~270 px even though
the strips are already hidden. Confirms similar bugs likely lurk for any
element that reserves space for the side strips outside a media query
that also hides them.

**How to apply:** include `{ width: 814, height: 903 }` in Playwright
screenshot scripts when verifying layout, alongside any wider/narrower
viewport you would normally check. If something looks wrong only at this
range, suspect formulas that subtract a fixed rem amount intended for
desktop chrome that has already been hidden by [[reduced-motion-variant-b]]'s
sibling `(max-width: 1024px)` media block.
