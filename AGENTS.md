# Repository Guidelines

## Project Structure & Module Organization

This repository is a static single-page landing site for Amigo.

- `index.html` contains the page markup and external CDN links.
- `css/style.css` contains global variables, layout, components, responsive rules, and animations.
- `js/main.js` contains browser interactions: mobile navigation, cube parallax, and chat widget behavior.
- `assets/images/` stores site images. Processed logos live in `assets/images/logos/`; originals live in `assets/images/logos_raw/`.
- `plans/` and `spec/` document the completed refactoring work.
- `process_logos.py` is a helper for trimming raw logo files into PNG assets.
- `refactor.py` is a historical helper script; do not rerun it unless you have reviewed its output carefully.

## Build, Test, and Development Commands

No package manager or build step is required.

- Open locally: `Start-Process .\index.html` on Windows, or open `index.html` in a browser.
- Check repository state: `git status --short`.
- Process logos, if Pillow is installed: `python process_logos.py`.

The page uses Google Fonts and Iconify CDNs, so verify visuals with internet access.

## Coding Style & Naming Conventions

- Use two-space indentation in HTML, CSS, and JavaScript.
- Keep filenames lowercase and descriptive. Use numeric prefixes where order matters, for example `01_yandex_direct.png`.
- Prefer external CSS classes over new inline styles.
- Keep CSS organized by existing sections: variables, global rules, navigation, hero, sections, footer, chat, and media queries.
- Use semantic HTML where practical and add `aria-label` for icon-only buttons.
- Preserve UTF-8 encoding; most user-facing text is Russian.

## Testing Guidelines

There is no automated test suite. Verify changes manually:

- Open `index.html` and check the console for missing assets or JavaScript errors.
- Test desktop and mobile widths, especially the mobile menu, hero layout, pricing cards, footer, and chat widget.
- Confirm logo paths and `assets/images/cube-wireframe.svg` load correctly.
- For chat changes, remember `mode: 'no-cors'` prevents reading webhook responses.

## Commit & Pull Request Guidelines

The current history only contains `initial commit`. Use short, imperative messages such as `fix mobile menu spacing` or `update pricing copy`.

Pull requests should include:

- A concise summary of what changed.
- Screenshots for visual changes.
- Notes on manual browser checks performed.
- Any changed external URLs, webhook endpoints, or CDN dependencies.

## Security & Configuration Tips

Do not commit secrets or private webhook tokens. Treat the webhook URL in `js/main.js` as configuration-sensitive, and document endpoint changes in the pull request.
