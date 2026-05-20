# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A detailed contributor guide exists in `AGENTS.md` (structure, coding style, manual testing checklist, commit/PR conventions). The `memory/` directory holds durable project facts (deploy access, reduced-motion decision, forms playbook) — read `memory/MEMORY.md`. This file focuses on the cross-file architecture and conventions those don't fully spell out.

## What this is

A static Russian-language marketing site for "Amigo". No package manager, no build step, no test suite, no framework. Pages: `index.html` (the landing), `product.html` ("Как работает Amigo" — the product/how-it-works page), `privacy.html` (ПДн policy); shared `css/style.css` + `js/main.js`; plus image assets and external CDNs (Google Fonts, Iconify).

`product.html` deliberately **reuses `index.html`'s component system** — the `.advantages-section` / `.advantages-grid` / `.advantage-card` card grid and the `mockup-*` visuals (`mockup-code-block`, `mockup-list`, `mockup-box`, `mockup-flow`). When restyling those for the product page, scope overrides under `#data-flow` (or the relevant section id) so `index.html` is not affected — the stylesheet is shared. `js/main.js` is loaded by all three pages, so every `initX` must no-op when its elements are absent.

## Asset cache-busting (do this on EVERY change)

All three HTML files carry `?v=N` query strings — on `css/style.css`, `js/main.js`, internal page links, **and every asset reference** (`product.html` has `?v=N` on its SVG logos etc.). **Any edit to CSS/JS/HTML requires bumping every `?v=N` occurrence across `index.html`, `privacy.html`, `product.html` in lockstep** (one shared N) or returning visitors keep the cached old build. This is the single most common omission — treat it as part of the edit, not an afterthought. The number only ever moves forward; don't assume a value, grep the current one.

Do the bump with the Edit tool or a UTF-8-safe script (Python `io.open(..., encoding='utf-8')`). **Never** bump via PowerShell `Get-Content`/`Set-Content` — PS 5.1 misreads these UTF-8 files as ANSI and corrupts all Cyrillic into mojibake. See `memory/cache-bust-utf8-pitfall.md`.

## Running and verifying

- Open locally: `Start-Process .\index.html` / `Start-Process .\product.html` (PowerShell). Internet required for fonts/icons. Use `Ctrl+F5` to bypass cache — if a change "isn't showing", suspect the browser cache first.
- No automated tests. The reliable way to verify visuals/interactions across viewports is the Playwright tooling in `tools/screenshots/` (gitignored from the main repo; it is its own separate git repo): `cd tools/screenshots && npm run shots`, or write/keep a one-off `_*.mjs` check there (e.g. `_cards_check.mjs`) that asserts computed styles/geometry and screenshots `#data-flow`. Use `reducedMotion: 'reduce'` in Playwright to reproduce the target environment (see below). Open a modal in scripts via `page.evaluate(() => document.querySelector('header .js-lead-open').click())` — header triggers are hidden behind the burger on ≤768px.
- Regenerate logo PNGs (needs Pillow): `python process_logos.py`. `refactor.py` is historical — do not rerun.

## JavaScript architecture (`js/main.js`)

All behavior is one file. `initPageInteractions()` is the single entry point (on `DOMContentLoaded`). It composes independent, self-contained `initX` closures, each a no-op if its elements are absent: `initMobileMenu`, `initCubeParallax`, `initChartHover`, `initChatWidget`, `initLeadFormModal`, `initCookieBanner`, `initChartLegendHover`. New features follow this pattern: a new `initX` registered at the bottom, guarded by element checks. Any user/bot text injected into the DOM goes through `escapeHtml` (preserve that ordering).

## Lead-form modal — one modal, many purposes (key system)

There is a single `#leadModal`. Every CTA that opens it carries class `js-lead-open`; its behavior is configured per-trigger via `data-` attributes read in `openModal` (`lastTrigger.dataset`):

- `data-lead-title` / `data-lead-subtitle` — header texts (default = "Оставить заявку" / its subtitle).
- `data-lead-title-accent` — bare = amber `.lead-modal__title--accent`; with a value (e.g. `teal`) = `.lead-modal__title--accent-<value>` (add the color to CSS).
- `data-lead-tg-title` — first line of the Telegram message (default `Новая заявка с сайта Amigo`).

Current modes: lead request (no data attrs), demo access (`Получить демо доступ`, accent `#1E3A8A`, TG `Запрос демо доступа…`), meeting (`Заказать встречу`, accent-teal `#176B87`, TG `Запрос встречи…`). To add a CTA: add `js-lead-open` + the relevant data attrs — never duplicate the modal. Triggers may be `<button>` or `<a href="#">`; the click handler calls `e.preventDefault()` so anchors don't jump. Pricing/footer `mailto:` CTAs were converted to `<button class="p-btn js-lead-open">`.

Delivery is a **direct browser → Telegram Bot API** call (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` constants at top of `main.js`, plain-text, no `parse_mode`, `AbortController` timeout). The token is therefore public — an accepted no-backend tradeoff (see `memory/telegram-lead-bot.md`). `TELEGRAM_CHAT_ID` is the group id and **must be negative**. The modal scroll lives on `.lead-modal__body` (inner) so the close button stays pinned; entrance uses `leadOverlayIn` + `leadModalIn`.

`initCookieBanner` is an informational consent bar persisting the choice in `localStorage.cookieConsent`; it links to `privacy.html`. `privacy.html` is the standalone ПДн policy page (operator details are placeholders).

## Chat widget protocol

Bidirectional, talks to an external n8n webhook. Contract in `spec/site-chat-bidirectional.md` — keep code and spec in sync.

- `WEBHOOK_URL` is a hardcoded, configuration-sensitive constant at the top of `main.js`.
- Per-visitor `sessionId` (`crypto.randomUUID`) persisted in `sessionStorage.chatSessionId`; sent with every message. Outbound: `POST WEBHOOK_URL { chatInput, sessionId }`, 60s `AbortController` timeout, normal CORS `fetch` (reads the body; not `no-cors` — `AGENTS.md`'s old `no-cors` note is superseded).
- `handleResponse`: `resp.type === 'clarification'` renders an inline Yes/No (`renderClarification`) that POSTs `{ approved }` to the server's `resumeUrl` and recurses; otherwise shows `resp.output || resp.text || resp.message`.
- Re-entrancy gated by `isSending` + disabled input. On `clarification` the input stays **disabled** until Yes/No is clicked — the `finally` deliberately checks `isClarification`; do not "fix" by unconditionally re-enabling.
- The lead-form modal keeps its own private timeout-fetch copy; do not refactor the chat's helper to share it.

## CSS conventions (`css/style.css`)

One large stylesheet in ordered sections (variables → global → nav → hero → sections → footer → chat → lead-modal → cookie → media/reduced-motion). Add to the matching section, prefer classes over inline styles, use `:root` custom properties.

**Reduced-motion ("Variant B", project decision):** the environment this site is reviewed in has OS reduce-motion ON. Do **not** wrap interactive/decorative motion in `@media (prefers-reduced-motion: reduce){ … : none }` — it makes hover/animations look abrupt for the customer and gets reported as a bug repeatedly. Only the continuous `.status-dot` pulse is suppressed there. See `memory/reduced-motion-variant-b.md`.

## Git & deploy

- `tools/screenshots` is gitignored from the main repo and is its **own** nested git repo — run main-repo git from the **repo root** (or `git -C "<repo root>"`), never from inside `tools/`. Feature work happens on a dedicated branch (varies per feature, e.g. `forms`, `page_about` — check `git branch --show-current`), merged to `master` via PR. The user owns all git add/commit/push/merge — do not run them unless explicitly asked.
- Production (`http://45.159.79.57/`) mirrors `master`. **Manual deploy only, no auto-update.** After merging to `master`, on the server run `bash /opt/amigo-site/deploy/deploy.sh` (must invoke via `bash` — `git reset --hard` inside it can drop the exec bit). Full details in `deploy/README.md`; server credentials live in gitignored `.env.local`; see `memory/deploy-access.md`.

## Specs and planning docs

`spec/` holds authoritative behavioral specs; `plans/` holds execution plans and the audit checklist; `specs/` holds feature specs authored via the `/create-spec` skill (`specs/template.md` defines the format). Feature workflow the customer expects: spec → answers in the file → confirm → plan → confirm → implement; the customer owns git commits/merges (see `memory/user-workflow.md`).
