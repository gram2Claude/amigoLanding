---
name: screen-blocks-jpg
description: User's full-browser-with-DevTools screen setup — screenshots saved to ./screenshot/ are 2560×1600 with DevTools docked right (~40 %), page viewport ≈1480 px wide
metadata:
  type: user
---

When the user drops a screenshot into `./screenshot/` (e.g. `blocks.jpg`)
it is **2560 × 1600 px**, Chrome maximised on a Windows display, DevTools
docked on the right taking roughly the rightmost 40 % of the window. The
actual page viewport in that setup is **≈1480 px wide × 1600 px tall**
(screenshot pixels; logical CSS pixels likely close to that, the user runs
at ~100 % DPI scaling based on UI sizing in the captures).

**Why:** the user flagged `.advantages-grid` cards as "cramped/stretched"
on `index.html` from `blocks.jpg`. At ~1480 px the old breakpoints kept
3 columns down to 900 px, so cards at 950-1300 px viewport became too
narrow/tall. Fix was an intermediate `@media (max-width: 1300px)` switch
to 2 columns. See [[cache-bust-utf8-pitfall]] for the ?v= bump done with
the fix.

**How to apply:** when verifying a fix the user reported from `./screenshot/`,
add `{ width: 1480, height: 1600 }` to Playwright screenshot scripts (in
addition to [[test-viewport-814x903]]). This is the "narrow desktop with
DevTools" viewport where 3-column desktop grids tend to squeeze.
