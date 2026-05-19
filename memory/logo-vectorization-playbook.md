---
name: logo-vectorization-playbook
description: Reusable approach for turning raster logos in assets/images/logos/ into clean SVGs (color trace, brand-color text, white/transparent bg)
metadata:
  type: project
---

Approved template for vectorizing logos (user confirmed "all great, save this
approach as a template"). Output goes to `assets/images/vector/<name>.svg`;
the source PNG/JPG in `assets/images/logos/` is never modified. Tooling
(`vtracer`, `fonttools`, Pillow) installs via pip on demand; render-verify
with the Playwright setup in `tools/screenshots/` (gitignored). Reusable
script: `vectorize_logo.py` at repo root (parallels `process_logos.py`).

**Why:** plain vtracer color-trace of thin/anti-aliased wordmarks looks fine
only because gradient shading hides roughness; flattening that trace to one
color exposes broken, blobby glyphs. The user wants crisp, brand-consistent,
font-independent logo SVGs.

**How to apply — pick per element:**

1. **Simple/flat logos & icons:** vtracer color trace —
   `colormode='color', hierarchical='stacked', mode='spline',
   filter_speckle=4, color_precision=7, layer_difference=12,
   corner_threshold=60, length_threshold=4.0, splice_threshold=45,
   path_precision=6`. Always add `viewBox="0 0 W H"` (vtracer omits it).
2. **Wordmark that has a real font** (e.g. «Метрика» = Segoe UI-ish): outline
   the glyphs to paths with `fontTools` (TTF from `C:\Windows\Fonts`, e.g.
   `segoeuil.ttf`). Live `<text>` is rejected — SVG-as-`<img>` ignores page
   web-fonts, so it renders OS-dependent (even serif). Measure the word's
   bbox on the original raster (Pillow) to place/scale; flip y via
   `scale(s,-s)` since font coords are y-up.
3. **Bespoke script wordmark, no font** (e.g. «ichance»): build a binary
   silhouette — upscale source ~5–6× (LANCZOS), color-classify the wordmark
   pixels into a black-on-white mask, vtracer `colormode='binary',
   mode='spline'` → one clean path, wrap in
   `<g fill="<MAIN>" transform="scale(1/k)">`. Do NOT flatten the low-res
   color trace to one color.
4. **Brand/main color:** sample the dominant opaque non-near-white pixel of
   the target element on the original raster; recolor text to that exact hex
   (ichance indigo was `#3B428A`). Keep multi-color marks (the violet
   «оригами») from the color trace; classify icon-vs-text by hue
   (purple: B=max, R−G≥~24, B≥~150, R≥~90).
4b. **Gradient logo** (color *is* the identity, e.g. rtb droid): do NOT
   flatten and do NOT plain color-trace (bands/mud). Build the ink
   silhouette (mask = opaque non-near-white, ×6, vtracer binary) and fill
   it with an SVG `<linearGradient>` whose stops are the mean ink color
   sampled per vertical band of the original (≈7 stops, x1=0→x2=1).
4c. **Hollow / outlined letters** (e.g. «droid» = stroke only, transparent
   counters): the binary trace makes rings, but vtracer's nonzero winding
   fills them solid. Add `fill-rule="evenodd"` on the silhouette `<g>` —
   genuine counters open; truly-solid shapes (filled letters, icon nodes,
   single-contour) are unaffected. Verify the interiors are actually
   transparent first (sample alpha), not a faint tint.
5. **Edges:** drop near-white anti-alias halo paths (luminance ≥ ~225) so
   borders are clean.
6. **Background:** white = full-bleed `<rect fill="#FFFFFF">` over the
   viewBox; transparent = omit the rect (user toggles per logo).
7. **Always** render the SVG vs the original PNG side-by-side at large and
   small sizes (inline the SVG / data-URI the PNG in Playwright `setContent`
   — `file://` in `setContent` is blocked) and report differences honestly
   before declaring done.

Related: [[forms-build-playbook]] (same screenshot-verify discipline),
[[reduced-motion-variant-b]], [[user-workflow]] (user owns commits).
