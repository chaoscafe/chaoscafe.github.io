# ChaosCafe Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-page static "business card" site for ChaosCafe Ltd at `https://chaoscafe.co.uk`, deployed to GitHub Pages from a Gitea push mirror.

**Architecture:** Hand-written HTML and one CSS file under `site/`, no JavaScript, no build step. Self-hosted fonts and images. Node's built-in test runner checks content, links, assets and colour contrast; Playwright checks layout in a real browser; `html-validate` and `lychee` validate markup and links. A GitHub Actions workflow runs the checks and uploads `site/` to Pages.

**Tech Stack:** HTML, CSS, Node 22 (`node:test`), `html-validate` 11, `@playwright/test` 1.64, `lychee` (CI action), GitHub Actions + GitHub Pages, Gitea push mirror, `rsvg-convert` + ImageMagick (one-off image generation), Fontsource 5.3.0 (font source files).

**Spec:** `docs/superpowers/specs/2026-10-09-chaoscafe-website-design.md`

## Global Constraints

- Only `site/` is published. `design/` is gitignored and must never be committed (the repo is mirrored to a public GitHub repo).
- No JavaScript in `site/`. No `<script>` tags, no third-party requests of any kind (fonts, analytics, CDNs).
- Design tokens (exact values): light — bg `#F4EFE6`, surface `#FBF8F2`, fg `#1A1814`, fg-muted `#5A4836`, link/primary `#2B3A67`, accent `#D2691E`; dark — bg `#131A2E`, surface `#1B2441`, fg `#FBF8F2`, fg-muted `#A9B2CB`, link `#EAB78A`.
- Fonts: Crimson Pro (display, 400/500), Inter Tight (body, 400/600), WOFF2, Latin subset, `font-display: swap`. JetBrains Mono and italics are not used, so not shipped.
- Text pairs meet WCAG AA (4.5:1) in both themes; the orange accent is never used for body text.
- Copy voice: first person singular, sentence case, no emoji, at most one exclamation mark per page. No invented clients, numbers or testimonials.
- Brand name is always `ChaosCafe`; the wordmark is `Chaos<span class="cc-accent-c">C</span>afe`.
- Statutory footer on every page: `ChaosCafe Ltd · Registered in England and Wales · Company no. 08162326 · Registered office: Devonshire House, 582 Honeypot Lane, Stanmore, Middlesex, HA7 1JS, United Kingdom · VAT GB143188122`.
- Placeholders are HTML comments `<!-- TODO(<key>): … -->` with keys exactly `booking`, `bluesky`, `email`. Book-a-call controls fall back to `https://www.linkedin.com/in/riccardocambiassi/`.
- `index.html` uses relative asset paths only (it must work under `/website/` before the domain cut-over). `404.html` uses root-absolute paths (GitHub serves it at any depth).
- Layout: 16px side gutter on phones, 32px from 768px; prose ≤ 680px; content ≤ 1100px; three-column cards and hero art from 900px; header sticky only when viewport height > 720px.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit locally; pushing to Gitea happens only in Task 8 with the user's go-ahead.

## Review Focus

1. **320px phones and long unbreakable strings** (footer legal line, headline) — the page must never scroll horizontally. Pinned by the overflow tests at 320/375/768/1280 × light/dark in Task 4.
2. **The preview URL lives under a sub-path** (`/website/`) until the domain moves — root-absolute paths in `index.html` would make the first deploy look broken. Pinned by "index.html uses only relative paths" in Task 3.
3. **Placeholders while details are missing** — a "Book a call" with an empty or `#` href, or a commented-out email/Bluesky link leaking into the page, would dead-end the main action. Pinned by the CTA and comment-leak tests in Task 3.
4. **Visitors on a dark system theme** — the dark palette must stay readable. Pinned by the contrast tests for both themes in Task 1.
5. **Self-hosted fonts silently failing** (wrong `url()` path falls back to Georgia without any error) — pinned by the CSS `url()` resolution test in Task 2 and the "fonts actually load, nothing third-party" browser test in Task 4.

---

### Task 1: Tooling, design tokens and contrast tests

**Files:**
- Create: `package.json` (via npm), `package-lock.json` (via npm)
- Create: `.htmlvalidate.json`
- Create: `playwright.config.mjs`
- Modify: `.gitignore`
- Create: `test/unit/helpers.mjs`
- Create: `test/unit/tokens.test.mjs`
- Create: `site/assets/css/site.css`

**Interfaces:**
- Produces: npm scripts `test` (unit + validate), `test:unit`, `validate`, `test:e2e`, `serve`, `check`; helpers `ROOT`, `SITE`, `read(rel)`, `stripComments(html)`, `attrValues(html, attr)`, `isExternal(url)`, `resolveLocal(fromRel, url)`, `luminance(hex)`, `contrast(hexA, hexB)`, `themeTokens(css) → { light, dark }`; CSS custom properties listed in Step 6.

- [ ] **Step 1: Create package.json and install dev dependencies**

```bash
cd /Users/bru/Code/ChaosCafe/website
cat > package.json <<'EOF'
{
  "name": "chaoscafe-website",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "serve": "python3 -m http.server 4173 --bind 127.0.0.1 --directory site",
    "test": "npm run test:unit && npm run validate",
    "test:unit": "node --test \"test/unit/*.test.mjs\"",
    "validate": "html-validate \"site/**/*.html\"",
    "test:e2e": "playwright test",
    "check": "npm test && npm run test:e2e"
  }
}
EOF
npm install --save-dev html-validate@11 @playwright/test@1.64
npx playwright install chromium
```

Expected: `package.json` gains `devDependencies` for both packages, `package-lock.json` is created, Chromium downloads.

- [ ] **Step 2: Add config files**

`.gitignore` (replace the whole file):

```gitignore
.DS_Store
# Claude Design export: local reference only, never mirrored to GitHub
design/
*.zip
node_modules/
test-results/
playwright-report/
.artifacts/
```

`.htmlvalidate.json`:

```json
{
  "extends": ["html-validate:recommended"]
}
```

`playwright.config.mjs`:

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '*.spec.mjs',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory site',
    url: 'http://127.0.0.1:4173/assets/css/site.css',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

- [ ] **Step 3: Write test helpers**

`test/unit/helpers.mjs`:

```js
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SITE = join(ROOT, 'site');

export const read = (rel) => readFileSync(join(SITE, rel), 'utf8');

export const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

export function attrValues(html, attr) {
  const re = new RegExp(`\\s${attr}="([^"]*)"`, 'g');
  return [...html.matchAll(re)].map((m) => m[1]);
}

export const isExternal = (url) => /^(https?:|mailto:|tel:|\/\/)/.test(url);

// Resolve a local href/src (relative or root-absolute) to a file under site/.
export function resolveLocal(fromRel, url) {
  const clean = url.split('#')[0].split('?')[0];
  if (clean === '') return null;
  const target = clean.startsWith('/')
    ? join(SITE, clean)
    : join(SITE, dirname(fromRel), clean);
  if (existsSync(target) && statSync(target).isDirectory()) return join(target, 'index.html');
  return target;
}

export function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// First :root block is the light theme; the second (inside the dark
// prefers-color-scheme query) overrides it. Only #rrggbb values are read.
export function themeTokens(css) {
  const blocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const parse = (block = '') =>
    Object.fromEntries(
      [...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]),
    );
  const light = parse(blocks[0]);
  return { light, dark: { ...light, ...parse(blocks[1]) } };
}
```

- [ ] **Step 4: Write the failing contrast tests**

`test/unit/tokens.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, themeTokens, contrast } from './helpers.mjs';

const TEXT_PAIRS = [
  ['fg', 'bg'], ['fg-muted', 'bg'], ['link', 'bg'], ['link-hover', 'bg'],
  ['fg', 'surface'], ['fg-muted', 'surface'], ['link', 'surface'],
  ['primary-fg', 'primary'],
];
const NON_TEXT_PAIRS = [['accent', 'bg'], ['accent', 'surface']];

const tokens = () => themeTokens(read('assets/css/site.css'));

function check(theme, pairs, min) {
  const t = tokens()[theme];
  for (const [fg, bg] of pairs) {
    assert.ok(t[fg] && t[bg], `${theme}: missing --${fg} or --${bg}`);
    const ratio = contrast(t[fg], t[bg]);
    assert.ok(ratio >= min, `${theme}: --${fg} on --${bg} is ${ratio.toFixed(2)}:1, need ${min}:1`);
  }
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: text pairs meet WCAG AA (4.5:1)`, () => check(theme, TEXT_PAIRS, 4.5));
  test(`${theme}: accent meets non-text contrast (3:1)`, () => check(theme, NON_TEXT_PAIRS, 3));
}

test('dark theme overrides surfaces and text', () => {
  const { light, dark } = tokens();
  assert.notEqual(dark.bg, light.bg);
  assert.notEqual(dark.fg, light.fg);
  assert.notEqual(dark.link, light.link);
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `ENOENT: no such file or directory … site/assets/css/site.css`.

- [ ] **Step 6: Write the tokens and base styles**

`site/assets/css/site.css`:

```css
/* ChaosCafe — site styles.
   Token values come from the ChaosCafe design system (Claude Design export);
   only the tokens this page uses are defined here. Semantic colours must stay
   #rrggbb literals: test/unit/tokens.test.mjs reads them to check contrast. */

/* ----- Tokens -------------------------------------------------- */

:root {
  color-scheme: light dark;

  --bg: #F4EFE6;
  --surface: #FBF8F2;
  --fg: #1A1814;
  --fg-muted: #5A4836;
  --link: #2B3A67;
  --link-hover: #934414;
  --primary: #2B3A67;
  --primary-fg: #FBF8F2;
  --accent: #D2691E;
  --selection: #F4DBC1;
  --border: rgba(132, 106, 80, 0.18);
  --header-bg: rgba(244, 239, 230, 0.78);

  --font-display: "Crimson Pro", "Iowan Old Style", Georgia, serif;
  --font-body: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --text-sm: 14px;
  --text-base: 17px;
  --text-lg: 22px;
  --text-2xl: 36px;
  --text-4xl: 64px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;

  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 24px;
  --radius-pill: 999px;

  --shadow-1: 0 1px 2px rgba(26, 24, 20, 0.04), 0 1px 1px rgba(26, 24, 20, 0.03);
  --shadow-2: 0 4px 12px rgba(26, 24, 20, 0.06), 0 2px 4px rgba(26, 24, 20, 0.04);

  --ease: cubic-bezier(0.32, 0.72, 0, 1);
  --dur-micro: 120ms;

  --max-prose: 680px;
  --max-content: 1100px;
  --gutter: 16px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #131A2E;
    --surface: #1B2441;
    --fg: #FBF8F2;
    --fg-muted: #A9B2CB;
    --link: #EAB78A;
    --link-hover: #F4DBC1;
    --primary: #FBF8F2;
    --primary-fg: #1B2441;
    --selection: #4F6391;
    --border: rgba(214, 218, 232, 0.14);
    --header-bg: rgba(19, 26, 46, 0.78);
  }
}

@media (min-width: 768px) {
  :root { --gutter: 32px; }
}

/* ----- Base ---------------------------------------------------- */

*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

img { display: block; max-width: 100%; height: auto; }

h1, h2, h3 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 500;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

h1 { font-size: clamp(var(--text-2xl), 6vw, var(--text-4xl)); line-height: 1.15; }
h2 { font-size: var(--text-2xl); line-height: 1.3; }
h3 { font-size: var(--text-lg); line-height: 1.3; }

p { margin: 0; max-width: var(--max-prose); text-wrap: pretty; }
p + p { margin-top: var(--space-4); }

a {
  color: var(--link);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: color var(--dur-micro) var(--ease);
}

a:hover { color: var(--link-hover); }

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 2px;
}

::selection { background: var(--selection); color: var(--fg); }

.lead {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  line-height: 1.5;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — 5 tests (light text, light accent, dark text, dark accent, dark overrides).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .gitignore .htmlvalidate.json playwright.config.mjs test/unit site/assets/css/site.css
git commit -m "Add tooling, design tokens and contrast tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Fonts and images

**Files:**
- Create: `site/assets/fonts/crimson-pro-latin-400-normal.woff2`, `crimson-pro-latin-500-normal.woff2`, `inter-tight-latin-400-normal.woff2`, `inter-tight-latin-600-normal.woff2`, `OFL-crimson-pro.txt`, `OFL-inter-tight.txt`
- Create: `site/assets/img/geometric-composition.svg`, `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `og-image.png`
- Modify: `site/assets/css/site.css` (add `@font-face` block at the top, after the header comment)
- Test: `test/unit/assets.test.mjs`

**Interfaces:**
- Consumes: `SITE`, `read`, `resolveLocal` from `test/unit/helpers.mjs`.
- Produces: font families `"Crimson Pro"` (400, 500) and `"Inter Tight"` (400, 600); image paths `assets/img/{geometric-composition.svg,favicon.svg,favicon-32.png,apple-touch-icon.png,og-image.png}`.

- [ ] **Step 1: Write the failing asset tests**

`test/unit/assets.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SITE, read, resolveLocal } from './helpers.mjs';

const FONTS = join(SITE, 'assets/fonts');
const IMG = join(SITE, 'assets/img');

function pngSize(file) {
  const buf = readFileSync(file);
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', `${file} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test('fonts are WOFF2 and within the size budget', () => {
  const files = readdirSync(FONTS).filter((f) => f.endsWith('.woff2'));
  assert.equal(files.length, 4, `expected 4 font files, found ${files.join(', ')}`);
  let total = 0;
  for (const f of files) {
    const buf = readFileSync(join(FONTS, f));
    assert.equal(buf.toString('ascii', 0, 4), 'wOF2', `${f} is not WOFF2`);
    total += buf.length;
  }
  assert.ok(total <= 200 * 1024, `fonts total ${Math.round(total / 1024)} KB, budget 200 KB`);
});

test('font licences ship with the fonts', () => {
  for (const f of ['OFL-crimson-pro.txt', 'OFL-inter-tight.txt']) {
    assert.ok(existsSync(join(FONTS, f)), `missing ${f}`);
  }
});

test('every url() in site.css resolves to a file', () => {
  const css = read('assets/css/site.css');
  const urls = [...css.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 4, 'expected @font-face url()s in site.css');
  for (const url of urls) {
    const target = resolveLocal('assets/css/site.css', url);
    assert.ok(existsSync(target), `site.css: ${url} does not resolve`);
  }
});

test('images exist at the expected sizes', () => {
  assert.deepEqual(pngSize(join(IMG, 'og-image.png')), { width: 1200, height: 630 });
  assert.deepEqual(pngSize(join(IMG, 'apple-touch-icon.png')), { width: 180, height: 180 });
  assert.deepEqual(pngSize(join(IMG, 'favicon-32.png')), { width: 32, height: 32 });
  for (const f of ['favicon.svg', 'geometric-composition.svg']) {
    assert.ok(statSync(join(IMG, f)).size > 0, `missing ${f}`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `ENOENT … site/assets/fonts` (and the url() test fails with "expected @font-face url()s").

- [ ] **Step 3: Fetch the fonts from Fontsource**

```bash
cd /Users/bru/Code/ChaosCafe/website
mkdir -p site/assets/fonts site/assets/img .artifacts/fontsource
( cd .artifacts/fontsource && npm pack -q @fontsource/crimson-pro@5.3.0 @fontsource/inter-tight@5.3.0 )
mkdir -p .artifacts/fontsource/crimson .artifacts/fontsource/inter
tar -xzf .artifacts/fontsource/fontsource-crimson-pro-5.3.0.tgz -C .artifacts/fontsource/crimson
tar -xzf .artifacts/fontsource/fontsource-inter-tight-5.3.0.tgz -C .artifacts/fontsource/inter
cp .artifacts/fontsource/crimson/package/files/crimson-pro-latin-{400,500}-normal.woff2 site/assets/fonts/
cp .artifacts/fontsource/inter/package/files/inter-tight-latin-{400,600}-normal.woff2 site/assets/fonts/
cp .artifacts/fontsource/crimson/package/LICENSE site/assets/fonts/OFL-crimson-pro.txt
cp .artifacts/fontsource/inter/package/LICENSE site/assets/fonts/OFL-inter-tight.txt
ls -l site/assets/fonts
```

Expected: four `.woff2` files and two `.txt` licences listed.

- [ ] **Step 4: Add the @font-face rules**

Insert into `site/assets/css/site.css` directly after the header comment, before `/* ----- Tokens`:

```css
/* ----- Fonts (self-hosted, Latin subset, from Fontsource 5.3.0) ---- */

@font-face {
  font-family: "Crimson Pro";
  src: url("../fonts/crimson-pro-latin-400-normal.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Crimson Pro";
  src: url("../fonts/crimson-pro-latin-500-normal.woff2") format("woff2");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Inter Tight";
  src: url("../fonts/inter-tight-latin-400-normal.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Inter Tight";
  src: url("../fonts/inter-tight-latin-600-normal.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 5: Create the SVG images**

`site/assets/img/geometric-composition.svg` (the design system's hero composition, without its caption):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" fill="none">
  <rect width="600" height="400" fill="#F4EFE6"/>
  <path d="M 0 400 A 200 200 0 0 1 400 400 Z" fill="#B5C4B2"/>
  <circle cx="450" cy="150" r="140" fill="#2B3A67"/>
  <circle cx="410" cy="120" r="40" fill="#F4EFE6"/>
  <line x1="0" y1="240" x2="600" y2="240" stroke="#1A1814" stroke-width="1.5"/>
  <circle cx="200" cy="240" r="8" fill="#D2691E"/>
  <text x="540" y="370" font-family="Crimson Pro, Georgia, serif" font-size="44" font-weight="500" fill="#2B3A67">λ</text>
</svg>
```

`site/assets/img/favicon.svg` (orange "C" on bone):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#F4EFE6"/>
  <path d="M22.9 10.2A9 9 0 1 0 22.9 21.8" fill="none" stroke="#D2691E" stroke-width="4.5" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 6: Render the PNGs**

```bash
cd /Users/bru/Code/ChaosCafe/website
rsvg-convert -w 32 -h 32 site/assets/img/favicon.svg -o site/assets/img/favicon-32.png
rsvg-convert -w 180 -h 180 site/assets/img/favicon.svg -o site/assets/img/apple-touch-icon.png
rsvg-convert -w 945 -h 630 site/assets/img/geometric-composition.svg -o .artifacts/geo-945.png
magick -size 1200x630 xc:'#F4EFE6' .artifacts/geo-945.png -gravity center -composite -strip site/assets/img/og-image.png
```

Then look at `site/assets/img/og-image.png` and `favicon-32.png` (Read tool) to confirm they render as a composition on bone and a recognisable orange "C".

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — all tokens and assets tests. If the font budget test fails, report the actual total; do not drop weights without asking.

- [ ] **Step 8: Commit**

```bash
git add site/assets test/unit/assets.test.mjs
git commit -m "Add self-hosted fonts, favicons and share image

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Home page markup and content

**Files:**
- Create: `site/index.html`
- Modify: `test/unit/helpers.mjs` (add `STATUTORY`, `LINKEDIN`)
- Test: `test/unit/content.test.mjs`, `test/unit/links.test.mjs`

**Interfaces:**
- Consumes: helpers from Task 1; asset paths from Task 2.
- Produces: class names used by Task 4 CSS and e2e tests — `.skip-link`, `.site-header`, `.header-inner`, `.wordmark`, `.cc-accent-c`, `.header-cta`, `.container`, `.hero`, `.hero-text`, `.hero-actions`, `.button`, `.status`, `.status-dot`, `.hero-art`, `.practice`, `.cards`, `.card`, `.about`, `.contact`, `.profiles`, `.site-footer`, `.legal`, `.colophon`; attribute `data-cta="book"`; `#main`.

- [ ] **Step 1: Add shared constants to the helpers**

Append to `test/unit/helpers.mjs`:

```js
export const LINKEDIN = 'https://www.linkedin.com/in/riccardocambiassi/';

export const STATUTORY = [
  'ChaosCafe Ltd',
  'Registered in England and Wales',
  'Company no. 08162326',
  'Registered office: Devonshire House, 582 Honeypot Lane, Stanmore, Middlesex, HA7 1JS, United Kingdom',
  'VAT GB143188122',
];
```

- [ ] **Step 2: Write the failing content tests**

`test/unit/content.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, stripComments, attrValues, LINKEDIN, STATUTORY } from './helpers.mjs';

const raw = read('index.html');
const html = stripComments(raw);
const meta = (attr, name) =>
  html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];

test('is British English', () => {
  assert.match(html, /<html lang="en-GB">/);
});

test('has exactly one h1', () => {
  assert.equal(html.match(/<h1[\s>]/g)?.length, 1);
});

test('footer carries the statutory company details', () => {
  const footer = html.slice(html.indexOf('<footer'));
  for (const s of STATUTORY) assert.ok(footer.includes(s), `footer is missing "${s}"`);
});

test('every book-a-call control links somewhere real', () => {
  const ctas = [...html.matchAll(/<a\b[^>]*data-cta="book"[^>]*>/g)].map((m) => m[0]);
  assert.ok(ctas.length >= 3, `expected 3 book-a-call links, found ${ctas.length}`);
  for (const tag of ctas) {
    const href = tag.match(/href="([^"]*)"/)?.[1] ?? '';
    assert.match(href, /^https:\/\/\S+$/, `bad book-a-call href in ${tag}`);
  }
});

test('links to LinkedIn, GitHub and 100Starlings', () => {
  const hrefs = attrValues(html, 'href');
  for (const url of [LINKEDIN, 'https://github.com/bru', 'https://100starlings.com']) {
    assert.ok(hrefs.includes(url), `missing link to ${url}`);
  }
});

test('placeholders are exactly booking, bluesky and email', () => {
  const keys = new Set([...raw.matchAll(/TODO\((\w+)\)/g)].map((m) => m[1]));
  assert.deepEqual([...keys].sort(), ['bluesky', 'booking', 'email']);
});

test('commented-out placeholders do not leak into the page', () => {
  assert.ok(!html.includes('mailto:'), 'email link is live');
  assert.ok(!html.includes('bsky.app'), 'Bluesky link is live');
});

test('has no JavaScript', () => {
  assert.doesNotMatch(html, /<script\b/i);
});

test('head metadata is complete', () => {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
  assert.ok(title.length > 0 && title.length <= 70, `title length ${title.length}`);
  assert.ok(meta('name', 'description'), 'missing meta description');
  assert.match(html, /<link rel="canonical" href="https:\/\/chaoscafe\.co\.uk\/">/);
  assert.equal(meta('property', 'og:image'), 'https://chaoscafe.co.uk/assets/img/og-image.png');
  assert.equal(meta('property', 'og:url'), 'https://chaoscafe.co.uk/');
  assert.ok(meta('property', 'og:title'), 'missing og:title');
  assert.ok(meta('property', 'og:description'), 'missing og:description');
  assert.equal(meta('name', 'twitter:card'), 'summary_large_image');
});
```

`test/unit/links.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE, read, stripComments, attrValues, isExternal, resolveLocal } from './helpers.mjs';

const PAGES = ['index.html', '404.html'].filter((p) => existsSync(join(SITE, p)));

const localRefs = (html) =>
  [...attrValues(html, 'href'), ...attrValues(html, 'src')]
    .filter((url) => !isExternal(url) && !url.startsWith('#'));

for (const page of PAGES) {
  test(`${page}: every local reference resolves`, () => {
    const html = stripComments(read(page));
    for (const url of localRefs(html)) {
      const target = resolveLocal(page, url);
      assert.ok(target && existsSync(target), `${page}: ${url} does not resolve`);
    }
  });

  test(`${page}: loads nothing from third parties`, () => {
    const html = stripComments(read(page));
    const loaded = [
      ...attrValues(html, 'src'),
      ...[...html.matchAll(/<link\b[^>]*>/g)]
        .map((m) => m[0])
        .filter((tag) => !/rel="canonical"/.test(tag))
        .map((tag) => tag.match(/href="([^"]*)"/)?.[1])
        .filter(Boolean),
    ];
    for (const url of loaded) assert.ok(!isExternal(url), `${page} loads ${url}`);
  });
}

test('index.html uses only relative paths (works under /website/ before cut-over)', () => {
  for (const url of localRefs(stripComments(read('index.html')))) {
    assert.ok(!url.startsWith('/'), `root-absolute path in index.html: ${url}`);
  }
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `ENOENT … site/index.html`.

- [ ] **Step 4: Write the page**

`site/index.html`:

```html
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ChaosCafe — Riccardo Cambiassi, fractional CTO</title>
  <meta name="description" content="ChaosCafe Ltd is the consultancy of Riccardo Cambiassi — fractional CTO, software architecture, platform engineering and Clojure.">
  <link rel="canonical" href="https://chaoscafe.co.uk/">
  <meta name="theme-color" content="#F4EFE6" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#131A2E" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="assets/img/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://chaoscafe.co.uk/">
  <meta property="og:title" content="ChaosCafe — Riccardo Cambiassi, fractional CTO">
  <meta property="og:description" content="Fractional CTO, software architecture, platform engineering and Clojure — from an independent practice in London.">
  <meta property="og:image" content="https://chaoscafe.co.uk/assets/img/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Flat geometric shapes in indigo, orange and sage on a warm off-white ground">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" href="assets/fonts/crimson-pro-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/css/site.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header">
    <div class="container header-inner">
      <a class="wordmark" href="./">Chaos<span class="cc-accent-c">C</span>afe</a>
      <!-- TODO(booking): when the booking page URL is known, replace the LinkedIn
           fallback in every link marked data-cta="book" (header, hero, contact). -->
      <a class="header-cta" data-cta="book" href="https://www.linkedin.com/in/riccardocambiassi/">Book a call</a>
    </div>
  </header>

  <main id="main">
    <section class="hero container" aria-labelledby="hero-title">
      <div class="hero-text">
        <h1 id="hero-title">I sit with complex systems until they explain themselves.</h1>
        <p class="lead">I’m Riccardo Cambiassi — a software consultant and fractional CTO. ChaosCafe Ltd is the small, deliberately unhurried company through which I do that work: architecture, platform engineering and the occasional piece of Clojure, for companies that need senior technical judgement without, necessarily, a full-time person attached to it.</p>
        <div class="hero-actions">
          <a class="button" data-cta="book" href="https://www.linkedin.com/in/riccardocambiassi/">Book a call <span aria-hidden="true">→</span></a>
          <p class="status"><span class="status-dot" aria-hidden="true"></span>Currently taking on new work</p>
        </div>
      </div>
      <img class="hero-art" src="assets/img/geometric-composition.svg" alt="" width="600" height="400">
    </section>

    <section class="practice container" aria-labelledby="practice-title">
      <h2 id="practice-title">What I do</h2>
      <ul class="cards">
        <li class="card">
          <h3>Fractional CTO</h3>
          <p>Technical leadership on a part-time basis, for as long as it is useful: architecture decisions, hiring, delivery, and the conversations with founders and boards that nobody else on the team particularly wants to have.</p>
        </li>
        <li class="card">
          <h3>Architecture and platform engineering</h3>
          <p>System design and platform foundations — and, more often than anyone would like, getting a complex system back under control, which generally begins by finding out, calmly, what it is actually made of.</p>
        </li>
        <li class="card">
          <h3>Clojure and interactive experiences</h3>
          <p>Hands-on build work where the problem is unusual: Clojure services, data-heavy back ends, and interactive pieces that have to behave themselves in front of an audience.</p>
        </li>
      </ul>
    </section>

    <section class="about container" aria-labelledby="about-title">
      <h2 id="about-title">About</h2>
      <p>I have spent most of my working life inside small and mid-sized agencies, building software and, eventually, running the companies that build it.</p>
      <p>In 2015 I co-founded <a href="https://100starlings.com">100Starlings</a>, a software development cooperative, with a couple of fellow engineers — boutique, loosely joined and fully distributed, with people in four countries across Europe and South America. It is still where most of my time goes. ChaosCafe is the rest of it: the fractional CTO and advisory work I take on directly.</p>
      <p>The name is a leftover from an early enthusiasm for chaos engineering — breaking systems on purpose to see, calmly, what they are made of. I have broadened since; the name, as far as I can tell, has not.</p>
    </section>

    <section class="contact container" aria-labelledby="contact-title">
      <h2 id="contact-title">Book a call</h2>
      <p>If there is a system, a team or a decision you are worried about, a short call is generally the cheapest available method for finding out whether the thing you’re worried about is, in fact, the thing.</p>
      <a class="button" data-cta="book" href="https://www.linkedin.com/in/riccardocambiassi/">Book a call <span aria-hidden="true">→</span></a>
      <!-- TODO(email): to publish an email address, uncomment this paragraph and set the address.
      <p class="contact-email">Or write to <a href="mailto:ADDRESS@chaoscafe.co.uk">ADDRESS@chaoscafe.co.uk</a>.</p>
      -->
      <ul class="profiles">
        <li><a href="https://www.linkedin.com/in/riccardocambiassi/">LinkedIn</a></li>
        <li><a href="https://github.com/bru">GitHub</a></li>
        <li><a href="https://100starlings.com">100Starlings</a></li>
        <!-- TODO(bluesky): uncomment and set the handle.
        <li><a href="https://bsky.app/profile/HANDLE">Bluesky</a></li>
        -->
      </ul>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p class="legal">ChaosCafe Ltd · Registered in England and Wales · Company no. 08162326 · Registered office: Devonshire House, 582 Honeypot Lane, Stanmore, Middlesex, HA7 1JS, United Kingdom · VAT GB143188122</p>
      <p class="colophon">© 2026 ChaosCafe Ltd <span aria-hidden="true">— λ</span></p>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 5: Run unit tests and the validator**

Run: `npm test`
Expected: PASS for all unit tests, and `html-validate` reports no errors. If `html-validate` reports a rule violation, fix the markup to satisfy the rule (rule docs: `https://html-validate.org/rules/<rule-id>.html`) without changing the copy, then re-run. Do not disable rules in `.htmlvalidate.json` without asking.

- [ ] **Step 6: Commit**

```bash
git add site/index.html test/unit/helpers.mjs test/unit/content.test.mjs test/unit/links.test.mjs
git commit -m "Add home page markup and copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Page layout and browser tests

**Files:**
- Modify: `site/assets/css/site.css` (append component styles)
- Test: `test/e2e/layout.spec.mjs`

**Interfaces:**
- Consumes: class names and `data-cta` from Task 3; tokens from Task 1; font families from Task 2.

- [ ] **Step 1: Write the failing browser tests**

`test/e2e/layout.spec.mjs`:

```js
import { test, expect } from '@playwright/test';

for (const colorScheme of ['light', 'dark']) {
  for (const width of [320, 375, 768, 1280]) {
    test(`no horizontal overflow at ${width}px (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test('hero art is hidden on phones and shown on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(page.locator('.hero-art')).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('.hero-art')).toBeVisible();
});

const cardBoxes = (page) =>
  page.locator('.card').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y) };
    }),
  );

test('practice cards stack on phones and sit in a row on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  let boxes = await cardBoxes(page);
  expect(boxes).toHaveLength(3);
  expect(new Set(boxes.map((b) => b.x)).size).toBe(1);
  expect(boxes[0].y).toBeLessThan(boxes[1].y);
  expect(boxes[1].y).toBeLessThan(boxes[2].y);

  await page.setViewportSize({ width: 1280, height: 800 });
  boxes = await cardBoxes(page);
  expect(new Set(boxes.map((b) => b.y)).size).toBe(1);
});

test('header is sticky only on tall viewports', async ({ page }) => {
  const position = () =>
    page.locator('.site-header').evaluate((el) => getComputedStyle(el).position);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  expect(await position()).toBe('sticky');
  await page.setViewportSize({ width: 1280, height: 600 });
  expect(await position()).toBe('static');
});

test('keyboard focus is visible, starting with the skip link', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Tab');
  const wordmark = page.locator('.wordmark');
  await expect(wordmark).toBeFocused();
  const outline = await wordmark.evaluate((el) => {
    const s = getComputedStyle(el);
    return `${s.outlineStyle} ${s.outlineWidth}`;
  });
  expect(outline).toBe('solid 2px');
});

test('reduced motion removes transitions', async ({ page }) => {
  const duration = () =>
    page.locator('.hero .button').evaluate((el) => getComputedStyle(el).transitionDuration);
  await page.goto('/');
  expect(await duration()).not.toBe('0s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await duration()).toBe('0s');
});

test('self-hosted fonts load and nothing comes from a third party', async ({ page, baseURL }) => {
  const requests = [];
  page.on('request', (req) => requests.push(req.url()));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].map((f) => ({ family: f.family.replace(/"/g, ''), status: f.status }));
  });
  const loaded = new Set(fonts.filter((f) => f.status === 'loaded').map((f) => f.family));
  expect(loaded).toEqual(new Set(['Crimson Pro', 'Inter Tight']));
  expect(fonts.filter((f) => f.status === 'error')).toEqual([]);
  expect(requests.filter((u) => !u.startsWith(baseURL))).toEqual([]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:e2e`
Expected: FAIL — overflow likely passes, but hero-art visibility, card layout, sticky header, skip-link viewport and reduced-motion tests fail (no component styles yet).

- [ ] **Step 3: Append the component styles**

Append to `site/assets/css/site.css`:

```css
/* ----- Layout -------------------------------------------------- */

.container {
  width: 100%;
  max-width: calc(var(--max-content) + 2 * var(--gutter));
  margin-inline: auto;
  padding-inline: var(--gutter);
}

.skip-link {
  position: absolute;
  top: -100px;
  left: var(--space-4);
  z-index: 20;
  padding: var(--space-2) var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-2);
}

.skip-link:focus { top: var(--space-2); }

/* ----- Header -------------------------------------------------- */

.site-header {
  z-index: 10;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

@media (min-height: 721px) {
  .site-header {
    position: sticky;
    top: 0;
    background: var(--header-bg);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    backdrop-filter: blur(12px) saturate(140%);
  }
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 64px;
}

.wordmark {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--fg);
  text-decoration: none;
}

.wordmark:hover { color: var(--fg); }

.cc-accent-c { color: var(--accent); }

.header-cta {
  font-size: var(--text-sm);
  font-weight: 600;
}

/* ----- Buttons ------------------------------------------------- */

.button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-sm);
  background: var(--primary);
  color: var(--primary-fg);
  font-weight: 600;
  text-decoration: none;
  box-shadow: var(--shadow-1);
  transition:
    box-shadow var(--dur-micro) var(--ease),
    transform var(--dur-micro) var(--ease);
}

.button:hover {
  color: var(--primary-fg);
  box-shadow: var(--shadow-2);
  transform: translateY(-1px);
}

.button:active {
  box-shadow: var(--shadow-1);
  transform: translateY(1px);
}

/* ----- Sections ------------------------------------------------ */

main > section { padding-block: var(--space-8); }

main > section > h2 { margin-bottom: var(--space-6); }

.hero {
  display: grid;
  gap: var(--space-7);
  align-items: center;
  padding-block: var(--space-8) var(--space-9);
}

.hero-text > * + * { margin-top: var(--space-5); }

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4) var(--space-5);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--fg-muted);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--accent);
}

.hero-art {
  display: none;
  border-radius: var(--radius-lg);
}

.cards {
  display: grid;
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-1);
}

.card h3 { margin-bottom: var(--space-3); }

@media (min-width: 900px) {
  .hero { grid-template-columns: 3fr 2fr; }
  .hero-art { display: block; }
  .cards { grid-template-columns: repeat(3, 1fr); }
}

.contact .button { margin-top: var(--space-6); }

.contact-email { margin-top: var(--space-5); }

.profiles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-5);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
}

/* ----- Footer -------------------------------------------------- */

.site-footer {
  padding-block: var(--space-7);
  border-top: 1px solid var(--border);
  font-size: var(--text-sm);
  color: var(--fg-muted);
}

.site-footer p { max-width: none; }

.legal { overflow-wrap: anywhere; }

.colophon { margin-top: var(--space-3); }

/* ----- Motion -------------------------------------------------- */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
  }

  .button:hover, .button:active { transform: none; }
}
```

- [ ] **Step 4: Run the browser tests to verify they pass**

Run: `npm run test:e2e`
Expected: PASS — 14 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm run check`
Expected: PASS — unit tests, `html-validate`, and browser tests.

- [ ] **Step 6: Commit**

```bash
git add site/assets/css/site.css test/e2e/layout.spec.mjs
git commit -m "Add page layout styles and browser layout tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 404 page

**Files:**
- Create: `site/404.html`
- Modify: `site/assets/css/site.css` (append `.notfound` rules before the Motion section)
- Test: `test/unit/notfound.test.mjs`, `test/e2e/notfound.spec.mjs`

**Interfaces:**
- Consumes: `STATUTORY`, `read`, `stripComments` from helpers; shared classes from Task 3/4. `test/unit/links.test.mjs` automatically covers `404.html` once it exists.

- [ ] **Step 1: Write the failing tests**

`test/unit/notfound.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, stripComments, STATUTORY } from './helpers.mjs';

const html = stripComments(read('404.html'));

test('404 has one h1, a link home and is not indexed', () => {
  assert.equal(html.match(/<h1[\s>]/g)?.length, 1);
  assert.match(html, /<a href="\/">/);
  assert.match(html, /<meta name="robots" content="noindex">/);
});

test('404 uses root-absolute asset paths (served at any depth)', () => {
  assert.match(html, /<link rel="stylesheet" href="\/assets\/css\/site\.css">/);
});

test('404 footer carries the statutory company details', () => {
  const footer = html.slice(html.indexOf('<footer'));
  for (const s of STATUTORY) assert.ok(footer.includes(s), `footer is missing "${s}"`);
});
```

`test/e2e/notfound.spec.mjs`:

```js
import { test, expect } from '@playwright/test';

test('404 page is styled', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/404.html');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(244, 239, 230)');
  await expect(page.locator('h1')).toBeVisible();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `ENOENT … site/404.html`.

- [ ] **Step 3: Write the page and its styles**

`site/404.html`:

```html
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found — ChaosCafe</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/img/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="wordmark" href="/">Chaos<span class="cc-accent-c">C</span>afe</a>
    </div>
  </header>

  <main id="main" class="container notfound">
    <h1>Nothing here.</h1>
    <p class="lead">This page doesn’t exist — or, as far as I can tell, never did.</p>
    <p><a href="/">Back to the front page <span aria-hidden="true">→</span></a></p>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p class="legal">ChaosCafe Ltd · Registered in England and Wales · Company no. 08162326 · Registered office: Devonshire House, 582 Honeypot Lane, Stanmore, Middlesex, HA7 1JS, United Kingdom · VAT GB143188122</p>
      <p class="colophon">© 2026 ChaosCafe Ltd <span aria-hidden="true">— λ</span></p>
    </div>
  </footer>
</body>
</html>
```

Insert into `site/assets/css/site.css` immediately before `/* ----- Motion`:

```css
/* ----- 404 ----------------------------------------------------- */

.notfound { padding-block: var(--space-9); }

.notfound > * + * { margin-top: var(--space-5); }
```

- [ ] **Step 4: Run the whole suite**

Run: `npm run check`
Expected: PASS — including `404.html` in the links tests and `html-validate`.

- [ ] **Step 5: Commit**

```bash
git add site/404.html site/assets/css/site.css test/unit/notfound.test.mjs test/e2e/notfound.spec.mjs
git commit -m "Add 404 page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: CI workflow and README

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `README.md` (replace)

**Interfaces:**
- Consumes: npm scripts `test`, `test:e2e` from Task 1.

- [ ] **Step 1: Write the workflow**

`.github/workflows/pages.yml`:

```yaml
name: Pages

on:
  push:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - name: Check links
        uses: lycheeverse/lychee-action@v2
        with:
          fail: true
          args: >-
            --no-progress
            --root-dir ${{ github.workspace }}/site
            --exclude 'linkedin\.com'
            --exclude '^https?://chaoscafe\.co\.uk'
            site/

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: check
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

Notes for the implementer: `linkedin.com` is excluded because it rejects automated checkers; `chaoscafe.co.uk` is excluded because canonical/OG URLs point at the live domain, which has a broken certificate until the cut-over in Task 8.

- [ ] **Step 2: Lint the workflow and run lychee locally (if available)**

```bash
command -v actionlint >/dev/null || brew install actionlint
actionlint .github/workflows/pages.yml
command -v lychee >/dev/null || brew install lychee
lychee --no-progress --root-dir "$PWD/site" --exclude 'linkedin\.com' --exclude '^https?://chaoscafe\.co\.uk' site/
```

Expected: `actionlint` prints nothing; `lychee` reports 0 errors. If `brew install` is not permitted, skip and note it — CI runs the same checks.

- [ ] **Step 3: Write the README**

`README.md`:

````markdown
# ChaosCafe

The website of ChaosCafe Ltd — <https://chaoscafe.co.uk>.

A single static page: hand-written HTML and CSS in `site/`, no JavaScript, no build step.
Design spec: `docs/superpowers/specs/2026-10-09-chaoscafe-website-design.md`.

## Editing

- Copy lives in `site/index.html`; styles in `site/assets/css/site.css`.
- Open placeholders: `grep -rn 'TODO(' site/`
  - `TODO(booking)` — replace the LinkedIn fallback in every `data-cta="book"` link.
  - `TODO(bluesky)` — uncomment the Bluesky link and set the handle.
  - `TODO(email)` — uncomment the email paragraph and set the address.
- The design-system export (`design/`) is a local reference only and is gitignored.

## Checks

```sh
npm ci
npx playwright install chromium
npm run check      # unit tests, html-validate, browser layout tests
npm run serve      # http://127.0.0.1:4173
```

## Deploying

Gitea (`ChaosCafe/website`) is the source of truth. It push-mirrors to GitHub
`chaoscafe/website`, where `.github/workflows/pages.yml` runs the checks on every
branch and deploys `site/` to GitHub Pages from `main`. Push to Gitea; never to GitHub.

## Domain

`chaoscafe.co.uk` is set as the custom domain in the GitHub repo's Pages settings
(there is no `CNAME` file) and verified in the `chaoscafe` organisation.

| Record | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| CNAME | `www` | `chaoscafe.github.io` |
| TXT | `_github-pages-challenge-chaoscafe` | value from the organisation's Pages settings |
````

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pages.yml README.md
git commit -m "Add Pages workflow and README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Visual and Lighthouse review (gate before going live)

**Files:** none committed (outputs go to `.artifacts/`, gitignored).

- [ ] **Step 1: Serve the site**

Run in the background: `npm run serve`

- [ ] **Step 2: Take screenshots**

```bash
mkdir -p .artifacts/screens
for scheme in light dark; do
  for size in "375,812" "768,1024" "1280,800"; do
    npx playwright screenshot --full-page --color-scheme "$scheme" --viewport-size "$size" \
      http://127.0.0.1:4173/ ".artifacts/screens/home-${size%%,*}-${scheme}.png"
  done
done
npx playwright screenshot --viewport-size "375,812" http://127.0.0.1:4173/404.html .artifacts/screens/404-375-light.png
```

Expected: seven PNGs in `.artifacts/screens/`.

- [ ] **Step 3: Review every screenshot**

Open each PNG with the Read tool. Check: wordmark C is orange; headline is Crimson Pro (not Georgia); hero art only at 1280; cards stacked at 375/768 and in a row at 1280; dark mode is deep indigo with readable text; footer legal line wraps cleanly; no element touches the screen edge on phones. Fix any defect in CSS, re-run `npm run check`, commit with a message describing the fix.

- [ ] **Step 4: Run Lighthouse**

```bash
CHROME_PATH="$(node --input-type=module -e "import { chromium } from '@playwright/test'; console.log(chromium.executablePath())")" \
  npx --yes lighthouse@13.5.0 http://127.0.0.1:4173/ \
  --chrome-flags="--headless=new" --quiet \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=.artifacts/lighthouse.json
node -e "const r=require('./.artifacts/lighthouse.json');for(const [k,c] of Object.entries(r.categories))console.log(k, Math.round(c.score*100))"
```

Expected: accessibility 100, best-practices 100, performance ≥ 95, seo ≥ 90. (The `node -e` call uses CommonJS `require`, which works because `-e` code is not affected by `"type": "module"`.) If a score falls short, read the failing audits in the JSON (`audits[*].score < 1`), fix, re-run.

- [ ] **Step 5: Stop the server and share results with the user**

Stop the background server. Show the user the light and dark screenshots at 375 and 1280, the Lighthouse scores, and ask them to read the copy. **Wait for their approval of the page before Task 8.** Apply any copy edits they request (re-run `npm run check`, commit).

---

### Task 8: Publish — GitHub repo, mirror and domain cut-over

Account actions. Claude runs the `gh` commands only after the user says so; the user does the registrar, token and Gitea steps. Confirm each external action before running it.

- [ ] **Step 1: Push to Gitea** (with the user's go-ahead)

```bash
git push origin main
```

- [ ] **Step 2: Create the GitHub repo and enable Pages via Actions** (Claude, with go-ahead)

```bash
gh repo create chaoscafe/website --public \
  --description "ChaosCafe Ltd website — mirror of Gitea ChaosCafe/website; do not push here" \
  --disable-issues --disable-wiki
gh api -X POST repos/chaoscafe/website/pages -f build_type=workflow
```

- [ ] **Step 3: Create the mirror token and Gitea push mirror** (user)

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate: resource owner `chaoscafe`, repository access "Only select repositories" → `chaoscafe/website`; permissions **Contents: Read and write** and **Workflows: Read and write** (needed to push `.github/workflows/`). Expiry as preferred — note the date.
2. Gitea → `ChaosCafe/website` → Settings → Repository → Mirror settings → Push mirror: URL `https://github.com/chaoscafe/website.git`, username = GitHub username, password = the token, tick "Sync when commits are pushed", then "Add push mirror" and "Synchronize now".

- [ ] **Step 4: Confirm the first deploy** (Claude)

```bash
gh run list -R chaoscafe/website --limit 3
gh run watch -R chaoscafe/website "$(gh run list -R chaoscafe/website --limit 1 --json databaseId -q '.[0].databaseId')"
gh api repos/chaoscafe/website/pages -q .html_url
```

Expected: run succeeds. Because the old org site still owns `chaoscafe.co.uk`, the preview is served at `http://chaoscafe.co.uk/website/` (not via HTTPS yet). Fetch it: `curl -s http://chaoscafe.co.uk/website/ | grep -o '<title>[^<]*'` should print the new title.

- [ ] **Step 5: Retire the old site** (Claude, with go-ahead)

```bash
gh api -X DELETE repos/chaoscafe/chaoscafe.github.com/pages
gh repo archive chaoscafe/chaoscafe.github.com --yes
```

- [ ] **Step 6: Verify the domain in the organisation** (user)

GitHub → `chaoscafe` org → Settings → Pages → Add a domain → `chaoscafe.co.uk`; add the TXT record it shows at the registrar; click Verify.

- [ ] **Step 7: Set the custom domain and DNS** (Claude for `gh`, user for DNS)

```bash
gh api -X PUT repos/chaoscafe/website/pages -f cname=chaoscafe.co.uk
```

At the registrar, replace the apex A record `192.30.252.153` with the four A records and add the four AAAA records and the `www` CNAME from the README table.

- [ ] **Step 8: Enforce HTTPS once the certificate is issued** (Claude)

```bash
dig +short chaoscafe.co.uk        # expect the four 185.199.x.153 addresses
gh api repos/chaoscafe/website/pages -q '.https_certificate.state'   # wait for "approved"
gh api -X PUT repos/chaoscafe/website/pages -F https_enforced=true
```

- [ ] **Step 9: Post-live checks** (Claude)

```bash
curl -sS -o /dev/null -w '%{http_code} %{ssl_verify_result}\n' https://chaoscafe.co.uk/    # 200 0
curl -sSI http://chaoscafe.co.uk/ | grep -i '^location'                                   # https://chaoscafe.co.uk/
curl -sSI https://www.chaoscafe.co.uk/ | grep -i '^location'                              # https://chaoscafe.co.uk/
curl -sS -o /dev/null -w '%{http_code}\n' https://chaoscafe.co.uk/no-such-page            # 404
curl -s https://chaoscafe.co.uk/no-such-page | grep -o '<title>[^<]*'                      # Page not found — ChaosCafe
```

Then ask the user to paste `https://chaoscafe.co.uk/` into LinkedIn Post Inspector (or opengraph.xyz) and confirm the title, description and share image.

- [ ] **Step 10: Update tracking**

Close the Control Tower tasks that are done (`ct tasks close …` — invoke the control-tower skill first for exact syntax), and add tasks for the remaining placeholders (booking link, Bluesky, email decision).
