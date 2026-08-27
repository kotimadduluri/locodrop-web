# LocoDrop marketing site

Static, zero-build landing page for **LocoDrop** (working name) - a privacy-first,
local-first, cross-platform file-transfer app. Framed as pre-release / early access.

Live: https://kotimadduluri.github.io/locodrop-web/

## Files

| File | What it is |
|------|-----------|
| `index.html` | The whole page. Semantic HTML, all copy lives here, plus a small inline vanilla-JS block (scroll reveal, marquee clone, hero-demo scaling + cursor parallax). |
| `styles.css` | All styling. Design tokens are the `:root` variables at the top. |
| `favicon.svg` | Tab icon. |
| `og.svg` | Social share image referenced by the Open Graph tags. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. |

No framework and no build step. The only external asset is the type pairing,
**Bricolage Grotesque** (kinetic display) + **Inter** (body), loaded from Google
Fonts via `<link>`; the system font stack is the fallback if the CDN is unreachable.

## Design notes

- **Type:** Bricolage Grotesque for large/display headings, Inter for body.
- **One accent:** Trust Blue `#0052FF` (lifted to `#4d84ff` in dark mode). No
  second hue; depth comes from blue at low alpha, neutrals, grain, and shadow.
- **Hero demo:** an encrypted file "packet" hops from phone to laptop along an
  animated link. The stage is a fixed `460x404` coordinate space scaled to fit its
  container (JS `ResizeObserver`), so the `offset-path` stays aligned at any width.
  A fine-pointer cursor adds a subtle 3D tilt. All of it collapses to a static,
  legible state under `prefers-reduced-motion`.
- **Sections:** platforms marquee ("the pairs that usually fight"), a sticky
  how-it-works scroller, and an asymmetric bento for the "why".
- Full light + dark via `prefers-color-scheme`; scroll reveals, marquee, and tilt
  all honor `prefers-reduced-motion`.

## Edit

Open `index.html` and edit the copy directly. To change look-and-feel, edit the
CSS custom properties in `:root` (and the `prefers-color-scheme: dark` block) at the
top of `styles.css`:

- `--accent` - the single accent colour (Trust Blue `#0052FF`).
- `--radius-lg`, `--radius`, `--radius-sm` - corner-radius scale.
- `--bg`, `--surface-*`, `--text*`, `--line*` - light/dark palettes.
- `--font-display`, `--font-body` - the two type families.

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
