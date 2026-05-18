# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A detailed contributor guide already exists in `AGENTS.md` (structure, coding style, manual testing checklist, commit/PR conventions). Read it. This file focuses on the cross-file architecture that `AGENTS.md` does not spell out.

## What this is

A static, single-page Russian-language marketing landing site for "Amigo". No package manager, no build step, no test suite, no framework. The entire site is `index.html` + `css/style.css` + `js/main.js`, plus image assets and external CDNs (Google Fonts, Iconify).

## Running and verifying

- Open the site: `Start-Process .\index.html` (PowerShell) or open `index.html` in a browser. Internet is required for fonts/icons to render.
- There are no automated tests. Verify manually per the checklist in `AGENTS.md` (desktop + mobile widths, mobile menu, hero, pricing, footer, chat). `plans/final_audit_checklist.md` is the concrete QA list.
- Regenerate logo PNGs from raw sources (needs Pillow): `python process_logos.py` — trims `assets/images/logos_raw/*` into `assets/images/logos/`. `refactor.py` is a one-off historical script; do not rerun it.

## JavaScript architecture (`js/main.js`)

All behavior lives in one file. `initPageInteractions()` is the single entry point (invoked on `DOMContentLoaded`, or immediately if the DOM is already parsed). It composes four independent, self-contained initializers, each of which no-ops if its target elements are absent:

- `initMobileMenu` — toggles `.nav-wrapper.active` and ARIA state.
- `initCubeParallax` — pointer-driven `transform` on `.cube` elements, throttled via `requestAnimationFrame`.
- `initChartHover` — interactive SVG chart. It parses `data-points` attributes ("x,y x,y …"), linearly interpolates Y for the cursor X, and positions the hover guide, points, and value labels. Changing the chart means changing both the SVG markup and these `data-points`.
- `initChatWidget` — the most complex piece; see below.

When adding a feature, follow this pattern: a new `initX` closure registered at the bottom of `initPageInteractions`, guarded by element-existence checks.

## Chat widget protocol (most important to understand)

The chat is **bidirectional** and talks to an external n8n-style webhook. The contract is specified in `spec/site-chat-bidirectional.md` (and `plans/site-chat-bidirectional.md`); keep code and that spec in sync when changing chat behavior.

Key facts that span multiple concerns:

- `WEBHOOK_URL` is a hardcoded constant at the top of `main.js` and is **configuration-sensitive** — treat it like a secret-ish endpoint, and document any change in the PR (per `AGENTS.md` security notes).
- A per-visitor `sessionId` is generated (`crypto.randomUUID`) and persisted in `sessionStorage` under `chatSessionId`. Every outbound message includes it.
- Outbound user message: `POST WEBHOOK_URL` with `{ chatInput, sessionId }`.
- Requests use a 60s timeout via `AbortController` (`REQUEST_TIMEOUT_MS`). The site **does read the response body** with a normal CORS `fetch` — it does *not* use `mode: 'no-cors'`. (Note: `AGENTS.md` still references an old `no-cors` approach; the current bidirectional implementation supersedes that. Trust the code + `spec/site-chat-bidirectional.md`.)
- Response handling (`handleResponse`): if `resp.type === 'clarification'`, it renders an inline Yes/No prompt (`renderClarification`) whose buttons `POST` `{ approved: boolean }` to the server-supplied `resumeUrl` and then recursively feed the reply back through `handleResponse`. Otherwise it shows `resp.output || resp.text || resp.message` (or treats a raw string / non-JSON body as the message text).
- Re-entrancy is gated by an `isSending` flag and disabled input. The subtle rule: on a `clarification` response the input is intentionally left **disabled** until the user clicks Yes/No — do not "fix" this by re-enabling input in the `finally` block; that logic deliberately checks `isClarification`.
- Bot messages render through `renderMarkdown`, which is built on `escapeHtml` — preserve that ordering so user/bot content cannot inject HTML.

## CSS conventions (`css/style.css`)

One ~1900-line stylesheet organized into ordered sections (variables → global → navigation → hero → sections → footer → chat → media queries). Add rules to the matching existing section rather than appending at the end, and prefer adding classes over inline styles. Theme values are CSS custom properties in the `:root` variables block.

## Specs and planning docs

`spec/` holds the authoritative behavioral specs (`refactoring_specification.md`, `site-chat-bidirectional.md`). `plans/` holds the execution plans and the final audit checklist. When asked to author a new spec, the `/create-spec` skill and `specs/template.md` define the expected format.
