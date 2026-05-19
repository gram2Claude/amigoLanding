"""Logo vectorization template — raster logos -> clean SVG.

Approved approach (see memory/logo-vectorization-playbook.md). Source PNG/JPG
in assets/images/logos/ is never modified; output -> assets/images/vector/.

Three modes, pick per logo (often combine: trace icon + outline/silhouette
the wordmark):

  trace       Simple/flat logos & icons. vtracer color trace + viewBox.
  font        Wordmark set in a real font. Outline glyphs to paths with
              fontTools so it is crisp and OS-independent (live <text> is
              rejected: SVG-as-<img> ignores page web-fonts).
  silhouette  Bespoke script wordmark, no font. Upscale ~6x, color-mask the
              wordmark, vtracer binary -> one clean path, fill brand color.

Helpers below also do: brand-color sampling from the original raster,
near-white halo drop, white/transparent background, side-by-side verify.

Deps (pip on demand): vtracer, fonttools, pillow. Always render-verify vs the
original before declaring done (verify_against_original()).

Usage examples:
  python vectorize_logo.py trace assets/images/logos/04_vk_ads.png
  python vectorize_logo.py silhouette assets/images/logos/00_ichance_logo.png \\
         --brand auto --bg white --exclude-purple-mark
"""
from __future__ import annotations
import argparse
import os
import re

VECTOR_DIR = "assets/images/vector"


# --- color helpers ----------------------------------------------------------
def lum(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


def is_purple_mark(r, g, b):
    """Heuristic for a violet/purple brand mark vs dark bluish text."""
    return b == max(r, g, b) and (r - g) >= 24 and b >= 150 and r >= 90


def dominant_color(src, predicate):
    """Most common exact opaque RGB on the original raster matching predicate."""
    from collections import Counter
    from PIL import Image

    im = Image.open(src).convert("RGBA")
    px = im.load()
    W, H = im.size
    c = Counter()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a > 200 and predicate(r, g, b):
                c[(r, g, b)] += 1
    (r, g, b), _ = c.most_common(1)[0]
    return "#%02X%02X%02X" % (r, g, b)


def add_viewbox(svg, W, H):
    if "viewBox" not in svg:
        svg = svg.replace("<svg ", '<svg viewBox="0 0 %d %d" ' % (W, H), 1)
    return svg


def wrap(W, H, body, bg="white", comment=""):
    rect = '<rect x="0" y="0" width="%d" height="%d" fill="#FFFFFF"/>\n' % (W, H)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        + ("<!-- %s -->\n" % comment if comment else "")
        + '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" '
        'width="%d" height="%d" viewBox="0 0 %d %d">\n' % (W, H, W, H)
        + (rect if bg == "white" else "")
        + body
        + "\n</svg>\n"
    )


# --- modes ------------------------------------------------------------------
def mode_trace(src, out, bg="white"):
    import vtracer
    from PIL import Image

    W, H = Image.open(src).size
    vtracer.convert_image_to_svg_py(
        src, out, colormode="color", hierarchical="stacked", mode="spline",
        filter_speckle=4, color_precision=7, layer_difference=12,
        corner_threshold=60, length_threshold=4.0, splice_threshold=45,
        path_precision=6,
    )
    s = add_viewbox(open(out, encoding="utf-8").read(), W, H)
    if bg == "white":
        s = s.replace(
            ">\n", '>\n<rect x="0" y="0" width="%d" height="%d" '
            'fill="#FFFFFF"/>\n' % (W, H), 1)
    open(out, "w", encoding="utf-8").write(s)
    return out


def mode_font(src, out, word, ttf, x, y, target_w, bg="white",
              fill="#000000"):
    """Outline `word` set in `ttf`, placed so its bbox spans target_w at x,
    baseline-ish at y (measure y/x from the original raster first)."""
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.boundsPen import BoundsPen
    from PIL import Image

    W, H = Image.open(src).size
    font = TTFont(ttf)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    paths, adv = [], 0
    xmin = ymin = 1e9
    xmax = ymax = -1e9
    for ch in word:
        gname = cmap[ord(ch)]
        sp = SVGPathPen(gs)
        gs[gname].draw(sp)
        paths.append((adv, sp.getCommands()))
        bp = BoundsPen(gs)
        gs[gname].draw(bp)
        if bp.bounds:
            x0, y0, x1, y1 = bp.bounds
            xmin = min(xmin, adv + x0)
            xmax = max(xmax, adv + x1)
            ymin = min(ymin, y0)
            ymax = max(ymax, y1)
        adv += hmtx[gname][0]
    S = float(target_w) / (xmax - xmin)
    TX = x - S * xmin
    TY = y + S * ymax
    glyphs = "".join(
        '<path transform="translate(%d,0)" d="%s"/>' % (a, d)
        for a, d in paths if d)
    g = ('<g fill="%s" transform="translate(%.3f,%.3f) scale(%.6f,%.6f)">%s'
         "</g>") % (fill, TX, TY, S, -S, glyphs)
    open(out, "w", encoding="utf-8").write(
        wrap(W, H, g, bg, "wordmark outlined from %s" % os.path.basename(ttf)))
    return out


def mode_silhouette(src, out, brand, bg="white", k=6,
                    exclude_purple_mark=True, icon_from=None):
    """Bespoke script: upscale x k, mask the wordmark pixels, vtracer binary
    -> one path filled `brand`. Optionally keep colored mark paths from a
    prior color trace (icon_from svg)."""
    import vtracer
    from PIL import Image

    im = Image.open(src).convert("RGBA")
    W, H = im.size
    up = im.resize((W * k, H * k), Image.LANCZOS)
    upx = up.load()
    mask = Image.new("RGB", up.size, (255, 255, 255))
    mpx = mask.load()
    for yy in range(H * k):
        for xx in range(W * k):
            r, g, b, a = upx[xx, yy]
            wordmark = (a > 140 and b >= g and b > r and lum(r, g, b) < 185
                        and (r - g) < 28)
            if exclude_purple_mark and is_purple_mark(r, g, b):
                wordmark = False
            if wordmark:
                mpx[xx, yy] = (0, 0, 0)
    os.makedirs("source-materials", exist_ok=True)
    mp = "source-materials/_vec_mask.png"
    mask.save(mp)
    raw = "source-materials/_vec_txt.svg"
    vtracer.convert_image_to_svg_py(
        mp, raw, colormode="binary", mode="spline", filter_speckle=10,
        corner_threshold=60, length_threshold=3.0, splice_threshold=48,
        path_precision=6)
    tp = re.findall(r"<path\b[^>]*?/>", open(raw, encoding="utf-8").read())[0]
    tp = re.sub(r'\sfill="[^"]*"', "", tp)
    body = '<g fill="%s" transform="scale(%.6f)">%s</g>\n' % (brand, 1.0 / k, tp)
    if icon_from and os.path.exists(icon_from):
        cur = open(icon_from, encoding="utf-8").read()
        for t in re.findall(r"<path\b[^>]*?/>", cur):
            m = re.search(r'fill="#([0-9A-Fa-f]{6})"', t)
            if m:
                hx = m.group(1)
                rr, gg, bb = (int(hx[0:2], 16), int(hx[2:4], 16),
                              int(hx[4:6], 16))
                if is_purple_mark(rr, gg, bb):
                    body += t + "\n"
    open(out, "w", encoding="utf-8").write(
        wrap(W, H, body, bg, "wordmark = binary silhouette @%dx, brand %s" %
             (k, brand)))
    return out


# --- verify -----------------------------------------------------------------
def verify_against_original(src, svg, png_out="source-materials/_vec_cmp.png"):
    """Render original PNG vs the SVG at large+small sizes for honest review.
    Run this and look at png_out before declaring the logo done."""
    import base64

    b64 = base64.b64encode(open(src, "rb").read()).decode()
    s = re.sub(r"<\?xml[^>]*\?>", "", open(svg, encoding="utf-8").read())
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    html = (
        '<body style="margin:0;background:#fff;font-family:sans-serif">'
        '<div style="padding:14px">'
        '<div>original</div><img src="data:image/png;base64,%s" '
        'style="width:560px;display:block;outline:1px solid #aaa">'
        '<div style="margin-top:14px">svg</div>%s'
        '<div style="margin-top:14px">svg @180</div>%s</div></body>'
    ) % (
        b64,
        s.replace("<svg ", '<svg style="width:560px;outline:1px solid #aaa" '),
        s.replace("<svg ", '<svg style="width:180px;outline:1px solid #aaa" '),
    )
    print("Render this HTML in Playwright (setContent) -> screenshot %s.\n"
          "Note: file:// in setContent is blocked; SVG is inlined and the "
          "PNG is a data-URI above." % png_out)
    return html


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("mode", choices=["trace", "font", "silhouette"])
    p.add_argument("src")
    p.add_argument("--out")
    p.add_argument("--bg", choices=["white", "transparent"], default="white")
    p.add_argument("--brand", default="auto",
                   help='hex like #3B428A, or "auto" to sample the original')
    p.add_argument("--word", help="font mode: the wordmark text")
    p.add_argument("--ttf", help="font mode: TTF path")
    p.add_argument("--x", type=float, help="font mode: left x (from raster)")
    p.add_argument("--y", type=float, help="font mode: baseline y")
    p.add_argument("--target-w", type=float, help="font mode: wordmark width")
    p.add_argument("--exclude-purple-mark", action="store_true")
    p.add_argument("--icon-from", help="silhouette: svg to lift the mark from")
    a = p.parse_args()

    out = a.out or os.path.join(
        VECTOR_DIR, os.path.splitext(os.path.basename(a.src))[0] + ".svg")
    os.makedirs(VECTOR_DIR, exist_ok=True)

    if a.mode == "trace":
        print(mode_trace(a.src, out, a.bg))
    elif a.mode == "font":
        brand = (a.brand if a.brand != "auto"
                 else dominant_color(a.src, lambda r, g, b: lum(r, g, b) < 110))
        print(mode_font(a.src, out, a.word, a.ttf, a.x, a.y, a.target_w,
                        a.bg, brand))
    else:
        brand = (a.brand if a.brand != "auto" else dominant_color(
            a.src, lambda r, g, b: b > 90 and r < 90 and g < 90 and b > r))
        print(mode_silhouette(a.src, out, brand, a.bg,
                              exclude_purple_mark=a.exclude_purple_mark,
                              icon_from=a.icon_from))
