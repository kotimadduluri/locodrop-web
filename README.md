# LocoDrop marketing site

Static, zero-build landing page for **LocoDrop** (working name) - a privacy-first,
local-first, cross-platform file-transfer app. Framed as pre-release / early access.

Live: https://kotimadduluri.github.io/locodrop-web/

## Files

| File | What it is |
|------|-----------|
| `index.html` | The whole page. Semantic HTML, all copy lives here. |
| `styles.css` | All styling. Design tokens are the `:root` variables at the top. |
| `favicon.svg` | Tab icon. |
| `og.svg` | Social share image referenced by the Open Graph tags. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. |

No framework, no build step, no dependencies. Fonts are the native system stack, so
nothing is fetched from a CDN.

## Edit

Open `index.html` and edit the copy directly. To change look-and-feel, edit the
CSS custom properties in `:root` (and the `prefers-color-scheme: dark` block) at the
top of `styles.css`:

- `--accent` - the single accent colour (Trust Blue `#0052FF`).
- `--radius`, `--radius-sm` - corner-radius scale.
- `--bg`, `--surface-*`, `--text*`, `--line*` - light/dark palettes.

Both light and dark themes follow the visitor's OS setting automatically.

Preview locally:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Redeploy

Push to `main`. GitHub Pages is configured to serve the site from the repository
root of the default branch, so a push publishes automatically.

```bash
git add -A && git commit -m "update site" && git push
```

## Notes

- "LocoDrop" is a **working name**, not cleared for public launch. If the product
  is renamed, update the copy in `index.html`, the `<title>`/OG tags, and the marks
  in `favicon.svg` / `og.svg`.
- The "Get early access" buttons are `mailto:` links. Swap in a real form/backend
  when one exists.
- `og.svg` is a vector social card. Some scrapers prefer PNG; export it to
  `og.png` (1200x630) and update the `og:image` path if richer previews matter.
