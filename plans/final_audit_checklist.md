# Final audit checklist

## SEO
- `html` language is `ru`.
- Title and description are readable Russian copy.
- Open Graph and Twitter summary metadata are present.
- `robots` is set to `index, follow`.
- `canonical` is intentionally not set until the production domain is known.
- `og:image` is intentionally not set until a dedicated social preview asset is available.

## Performance
- Logo images define intrinsic `width` and `height`.
- Logo images use `decoding="async"`.
- Power BI logo uses WebP with PNG fallback.
- Hero marquee logos are not lazy-loaded because they are first-viewport content.
- CSS no longer uses `transition: all`.
- Motion-heavy UI respects `prefers-reduced-motion`.

## Accessibility
- Main document language is Russian.
- Header navigation, pricing links, footer links, and chat controls are keyboard reachable.
- Mobile menu and chat controls update `aria-expanded`.
- Chat window exposes a labelled non-modal region and closes with `Escape`.
- Visible `:focus-visible` styles are present for links, buttons, and inputs.

## Security
- The n8n webhook URL in `js/main.js` is public client-side configuration and must not contain secrets or private tokens.
- Chat messages are inserted with `textContent`, not `innerHTML`.
- External CDN dependencies are Google Fonts and Iconify.
- No `target="_blank"` links are present, so `rel="noopener"` is not currently required.
- `referrer` policy is set to `strict-origin-when-cross-origin`.

## Manual browser checks
- Open `index.html` with internet access for Google Fonts and Iconify.
- Check desktop widths around 1440, 1280, and 1024 px.
- Check mobile widths around 390, 430, and 768 px.
- Verify there is no horizontal page scroll.
- Verify hero, logo marquee, pricing cards, footer, mobile menu, and chat widget.
- Verify chat sends `{ chatInput, sessionId }` with `mode: 'no-cors'`.
