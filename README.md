# ChaosCafe

The website of ChaosCafe Ltd — <https://chaoscafe.co.uk>.

A single static page: hand-written HTML and CSS in `site/`, no JavaScript, no build step.
Design spec: `docs/superpowers/specs/2026-10-09-chaoscafe-website-design.md`.

## Editing

- Copy lives in `site/index.html`; styles in `site/assets/css/site.css`.
- Open placeholders: `grep -rn 'TODO(' site/`
  - `TODO(booking)` — replace the LinkedIn fallback in every `data-cta="book"` link (in `index.html` and `404.html`).
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
`chaoscafe/chaoscafe.github.io` (the organisation's Pages site), where `.github/workflows/pages.yml` runs the checks on every
branch and deploys `site/` to GitHub Pages from `main`. Push to Gitea; never to GitHub.

## Domain

`chaoscafe.co.uk` is set as the custom domain in the GitHub repo's Pages settings
(there is no `CNAME` file) and verified in the `chaoscafe` organisation.
Because this is the organisation site, any other `chaoscafe` repo with Pages enabled
(e.g. a future `blog`) is served at `chaoscafe.co.uk/<repo>/`.

The pre-2026 placeholder site that used to live in that repo is kept in Gitea as
the tag `legacy-2012`.

| Record | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| CNAME | `www` | `chaoscafe.github.io` |
| TXT | `_github-pages-challenge-chaoscafe` | value from the organisation's Pages settings |
