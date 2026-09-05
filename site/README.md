# riftvesting.com — site

Static Astro site built from the JSON in the repo root (`cards/`, `sets.json`, `watchlist.json`, `inventory.json`, `images/`).

- `npm install` once, then `npm run build` → `dist/`. `npm run dev` for a live preview.
- The build copies `../images` into `public/images` (ignored by git) and reads the data from `..` (override with `DATA_ROOT`).
- Deployed by `.github/workflows/deploy.yml` to GitHub Pages on every push to `main`. `SITE_BASE` in that file is `/riftvesting` while the site lives under `fortnitefire.github.io/riftvesting`; change it to `/` (and `SITE_URL` to `https://riftvesting.com`) when the custom domain is attached.
- Shop payment details live in `src/lib/shop.ts`.
