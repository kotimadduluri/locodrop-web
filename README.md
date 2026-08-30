# LocoDrop marketing site

Static, zero-build landing page for **LocoDrop** (working name) — a privacy-first,
local-first, cross-platform file-transfer app. Framed as pre-release / early access.

Live: https://kotimadduluri.github.io/locodrop-web/

## Structure

```
index.html          The page: semantic HTML + all copy. FAQ JSON-LD + no-flash
                    theme script inline in <head>.
css/styles.css      All styling. Design tokens are the :root variables at the top.
js/app.js           UI: theme toggle, scroll reveals, the hero wordmark "flip"
                    dock transition, scene fade/lift on scroll, mesh animation.
js/cube.js          WebGL raymarched "data cube" (canvas #orbGL), with a CSS
                    fallback orb if WebGL is unavailable.
assets/favicon.svg  Tab icon.
assets/og.svg       Social share image (see note below re: PNG).
.nojekyll           Serve files as-is (so js/ and css/ folders work).
```

No framework, no build step, no bundler — plain static files served directly by
GitHub Pages. Scripts load at the end of `<body>`; the only external dependency is
the type pairing, loaded from Google Fonts via `<link>` (system stack as fallback).

## Design notes

- **Type:** **Archivo Expanded** (800/900) for the wordmark, **Hanken Grotesk**
  (400–800) for headings/body/nav, **JetBrains Mono** (500/600) for labels.
- **One accent:** brand lime (`#c6f04d`, tuned per theme). No second hue — depth
  comes from neutrals, grain, shadow, and the lime glow on the hero.
- **Hero:** a full-width `LOCODROP` wordmark over a WebGL "data cube" wrapped by
  three orbital rings. On scroll the wordmark rides a curved path and docks into
  the header (a shared-element hand-off), the header sheet transforms, and the
  cube rises above the section line then fades. All of it collapses to a static,
  legible state under `prefers-reduced-motion`.
- **Sections:** platforms mesh ("every device, one private mesh"), a sticky
  how-it-works scroller, a bento "why" grid, and an FAQ.
- **Theme:** Auto / Light / Dark toggle in the header (Auto follows the OS and is
  remembered per-browser). Full token-level light + dark support.

## Edit

Open `index.html` for copy. For look-and-feel, edit the CSS custom properties in
`:root` (and the `prefers-color-scheme: dark` / `[data-theme="dark"]` blocks) at the
top of `css/styles.css`:

- `--accent` — the single accent colour (brand lime).
- `--radius-lg`, `--radius`, `--radius-sm` — corner-radius scale.
- `--bg`, `--surface-*`, `--text*`, `--line*` — light/dark palettes.
- `--font-wordmark`, `--font-body`, `--font-mono` — the type families.

Preview locally (a server is needed so the `css/` and `js/` files resolve):

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Redeploy

Push to `main`. GitHub Pages serves the site from the repository root of the
default branch, so a push publishes automatically.

```bash
git add -A && git commit -m "update site" && git push
```

## Notes

- "LocoDrop" is a **working name**, not cleared for public launch. If the product
  is renamed, update the copy in `index.html`, the `<title>`/OG/JSON-LD tags, and
  the marks in `assets/favicon.svg` / `assets/og.svg`.
- The "Get early access" buttons are `mailto:` links. Swap in a real form/backend
  when one exists.
- `assets/og.svg` is a vector social card. Most social scrapers don't render SVG —
  export a `og.png` (1200×630) and point `og:image` at the absolute PNG URL for
  rich link previews. `og:image` is already an absolute URL.
