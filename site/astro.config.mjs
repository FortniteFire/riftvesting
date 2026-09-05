import { defineConfig } from 'astro/config';

// SITE_BASE is "/riftvesting" while the site lives at fortnitefire.github.io/riftvesting,
// and "/" once riftvesting.com points at it. Both are set in .github/workflows/deploy.yml.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://riftvesting.com',
  base: process.env.SITE_BASE ?? '/',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
