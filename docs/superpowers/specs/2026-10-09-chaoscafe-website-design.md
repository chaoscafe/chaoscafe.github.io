# ChaosCafe website — design

- **Date:** 2026-10-09
- **Status:** awaiting review
- **Tracking:** Control Tower issue #187

## Goal

A single-page "business card" website at `https://chaoscafe.co.uk` that presents **Riccardo Cambiassi** as the professional, trading as **ChaosCafe Ltd** (the brand): a credible presence for his fractional CTO and consulting work, with an obvious way to book a call, links to his profiles and to 100Starlings, and the statutory company details a UK Ltd must display.

### Success criteria

- A prospective client landing on the page understands within one screen who Riccardo is, what he does, and how to book a call.
- The page carries the statutory disclosures (registered name, place of registration, company number, registered office).
- `https://chaoscafe.co.uk` serves the page with a valid certificate; `http://` and `www.` redirect to it.
- Updating copy or a link is a one-line edit followed by a push to Gitea; nothing else needs maintaining.

### Out of scope

- The blog / writing. It will be a separate subproject later (own repo, likely its own subdomain or path); nothing here should prevent that, but nothing is built for it now.
- A final logo. The design system's text wordmark is used until a mark is chosen.
- Contact forms, analytics, cookies, JavaScript of any kind.
- Testimonials / pull quotes (only if a real client quote is supplied later).

## Inputs

### Design system

The Claude Design export (`design/claude-design-export/`, local only — gitignored, see *Repository*) is the visual and verbal reference:

- **Colour:** Bone `#F4EFE6` page, Indigo `#2B3A67` primary, Orange `#D2691E` accent used sparingly, Ink `#1A1814` text, Clay/Sage supporting tones. Dark mode is deep indigo, following `prefers-color-scheme`.
- **Type:** Crimson Pro (display), Inter Tight (body/UI), JetBrains Mono (mono). Body 17px / 1.6.
- **Rules:** 8pt spacing scale, radii 6/12/24/999, three shadows, flat surfaces (no gradients, grain, inner shadows), orange 2px focus ring, motion easing `cubic-bezier(0.32, 0.72, 0, 1)`, reduced-motion respected, prose max 680px, content max 1100px.
- **Voice:** first person singular, dry. Headings and the hero are short and direct, often a statement ending in a full stop; body text (cards, About, contact) can run longer and more literary. Sentence case, no emoji, at most one exclamation mark per page. Avoid contrast-flip constructions ("not X; Y", "X rather than Y") — they read as machine-written. (Revised 2026-10-12, after richholman.com / dgw.ltd as inspiration.)
- **Wordmark:** plain text `Chaos<span class="cc-accent-c">C</span>afe`, second C in orange.
- **Imagery:** `assets/geometric-composition.svg` (abstract flat shapes).

The export's code is reference only; the site is written fresh.

### Facts

| Item | Value |
|---|---|
| Registered name | ChaosCafe Ltd |
| Registered in | England and Wales |
| Company number | 08162326 |
| Registered office | Devonshire House, 582 Honeypot Lane, Stanmore, Middlesex, HA7 1JS, United Kingdom |
| VAT | GB143188122 |
| LinkedIn | https://www.linkedin.com/in/riccardocambiassi/ |
| GitHub | https://github.com/bru |
| 100Starlings | https://100starlings.com |
| Booking link | *placeholder — to be supplied* |
| Bluesky | *placeholder — to be supplied* |
| Email | *optional — prepared but commented out* |

## Page structure and content

One scrolling page, in order:

1. **Header** — text wordmark left, a small "Book a call" link right. No other navigation. Fixed (with the design system's backdrop blur) only on viewports taller than 720px.
2. **Hero** — a small "London · trading as ChaosCafe Ltd" overline, Riccardo's name as the h1, the tagline "I sit with complex systems until they explain themselves.", and a one-line lead: fractional CTO and software consultant, decisions you won't regret, systems simple enough to change. A "Book a call →" primary button and a small "available for new work" line with the orange status dot. The geometric composition sits alongside on wide viewports and is hidden on narrow ones.
3. **Practice** — three cards:
   - *Fractional CTO* — ongoing technical leadership for companies that need a CTO's judgement without a full-time one.
   - *Architecture and platform engineering* — system design, platform foundations, getting complex systems back under control.
   - *Simple, not easy.* — taking accidental complexity out of systems (a nod to Rich Hickey's *Simple Made Easy*; attribution/link may follow). Clojure is deliberately not named anywhere on the site.
4. **About** — a few short paragraphs: years in small and mid-sized agencies (much of it interactive work: installations, live events), experience running companies, co-founding the 100Starlings software cooperative in 2015 (boutique, loosely joined, fully distributed across four countries in Europe and South America), and how ChaosCafe relates to it. Links to 100starlings.com. Ends with where the name comes from (chaos engineering) and how the work now goes towards smaller systems.
5. **Contact** — headed "Something you're worried about? Let's talk.", a short closing invitation in house voice, the "Book a call" button, the optional email link, and profile links (LinkedIn, GitHub, Bluesky).
6. **Footer** — "Riccardo Cambiassi trades through ChaosCafe Ltd · Registered in England and Wales · Company no. 08162326 · Registered office: Devonshire House, 582 Honeypot Lane, Stanmore, Middlesex, HA7 1JS · VAT GB143188122", then "© 2026 ChaosCafe Ltd" and the λ sign-off.

**Head metadata:** `<title>`, meta description, canonical URL, Open Graph and Twitter card tags with a 1200×630 share image derived from the geometric composition, favicon (SVG orange "C" with a PNG fallback and `apple-touch-icon`), `theme-color` for both schemes.

**Copy:** drafted by Claude in the house voice, reviewed and edited by Riccardo. Claims are limited to the facts above — no invented clients, numbers or testimonials.

**404 page:** `site/404.html`, same header/footer and styles, one dry sentence and a link home.

### Placeholders

Every unresolved item is marked with an HTML comment of the form `<!-- TODO(<key>): ... -->` so `grep -rn 'TODO(' site/` lists them all:

- `TODO(booking)` — until the booking URL exists, every "Book a call" control links to the LinkedIn profile, so the primary action never dead-ends.
- `TODO(bluesky)` — the Bluesky link is present but commented out.
- `TODO(email)` — the `mailto:` link is present but commented out.

## Repository

```
/
├── site/                     ← the only thing published
│   ├── index.html
│   ├── 404.html
│   └── assets/
│       ├── css/site.css      ← design tokens (only those used) + page styles
│       ├── fonts/*.woff2     ← self-hosted, Latin subset, used weights only
│       └── img/              ← geometric-composition.svg, favicon set, og-image.png
├── .github/workflows/pages.yml
├── docs/superpowers/specs/   ← this spec; plans alongside
├── .gitignore                ← design/, *.zip, .DS_Store
└── README.md                 ← editing placeholders, deploy pipeline, DNS notes
```

- `design/claude-design-export/` stays on disk as a local reference and is **gitignored**, because the whole repo is mirrored to a public GitHub repo. The assets the site needs (geometric SVG, token values) are copied into `site/assets/`.
- No `CNAME` file: with Actions-based Pages deploys, the custom domain is set in repository settings.

## Styling and behaviour

- One stylesheet, `site.css`: the subset of design-system tokens actually used as custom properties on `:root`, dark-mode overrides under `prefers-color-scheme: dark`, then page styles. Mobile-first.
- Fonts self-hosted as WOFF2 with `font-display: swap`; no requests to Google or any other third party. Weights: Crimson Pro 400/500 + 400 italic, Inter Tight 400/600, JetBrains Mono 400 (only if mono is actually used; drop otherwise). Target total ≲ 150 KB.
- No JavaScript.
- Layout: 16px side gutter on phones; practice cards stack on narrow screens and become a three-column grid from ~900px; prose capped at 680px, content at 1100px.
- Accessibility: semantic landmarks (`header`, `main`, `section`s with headings, `footer`), a single `h1`, logical heading order, WCAG AA contrast in both themes, visible orange focus ring, `prefers-reduced-motion` disables transitions, decorative SVG marked `aria-hidden`.

## Deployment

### Pipeline

1. **Source of truth:** Gitea `ChaosCafe/website`.
2. **Push mirror:** Gitea push-mirrors to GitHub `chaoscafe/chaoscafe.github.io` (public; the organisation's Pages site, reused from the 2012 `chaoscafe.github.com` repo and renamed) using a fine-grained GitHub token scoped to that repository only (contents and workflows: read/write). Nobody pushes to GitHub directly, apart from a one-off bootstrap push of `main`. Reusing the organisation site means the page is served at `/` and future project repos (e.g. a blog) appear at `chaoscafe.co.uk/<repo>/`.
3. **GitHub Actions** — `.github/workflows/pages.yml`:
   - Trigger: push (any branch) and manual dispatch.
   - `check` job: `html-validate` on `site/**/*.html`; `lychee` link check on `site/` (internal and external; LinkedIn excluded because it blocks automated checkers). Any failure fails the run.
   - `deploy` job (only on `main`, needs `check`): `actions/upload-pages-artifact` with `path: site`, then `actions/deploy-pages`. No build step.
   - Actions pinned to specific versions; permissions limited to `contents: read`, `pages: write`, `id-token: write`; `concurrency` group so deploys don't overlap.

### Domain cut-over

Done once, in this order (account actions by Riccardo unless he asks Claude to do the GitHub side with `gh`):

1. Tag the old placeholder's `master` into Gitea as `legacy-2012`; rename `chaoscafe/chaoscafe.github.com` to `chaoscafe.github.io`; set Pages source to "GitHub Actions".
2. Bootstrap-push `main`, make it the default branch, delete `master`, configure the Gitea push mirror, and confirm the first deploy.
3. Verify `chaoscafe.co.uk` in the `chaoscafe` organisation's Pages settings (TXT record) to prevent domain takeover.
4. Confirm `chaoscafe.co.uk` is still the custom domain on `chaoscafe/chaoscafe.github.io` (it carries over from the old site).
5. DNS at the registrar:
   - Apex A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (replacing the legacy `192.30.252.153`).
   - Apex AAAA records: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
   - `www` CNAME → `chaoscafe.github.io`.
6. When GitHub has provisioned the certificate, enable **Enforce HTTPS**.

The placeholder is replaced (over plain HTTP) as soon as step 2 deploys; HTTPS follows the DNS change. This is acceptable (the current site is a 2013 placeholder).

## Verification

**CI (every push):** `html-validate` and `lychee` pass; deploy only from `main`.

**Local, before first deploy (Claude):**

- Serve `site/` statically; headless-browser screenshots at 375, 768 and 1280px in light and dark schemes, reviewed and shared.
- Lighthouse: Accessibility 100, Best Practices 100, Performance ≥ 95.
- Contrast check of every text/background pair in both themes.
- Keyboard-only pass: focus ring visible on every interactive element.
- Reduced-motion pass: no transitions.
- `grep -rn 'TODO(' site/` lists exactly the expected placeholders.

**After go-live:**

- `https://chaoscafe.co.uk` serves the new page with a valid certificate.
- `http://chaoscafe.co.uk` and `https://www.chaoscafe.co.uk` redirect to `https://chaoscafe.co.uk`.
- Link preview (LinkedIn Post Inspector or opengraph.xyz) shows the correct title, description and image.
- An unknown path serves the 404 page.

## Future work (not in this spec)

- Blog / writing subproject, styled from the same design system.
- Final logo mark; swap it into the header, favicon and share image.
- Fill placeholders: booking link, Bluesky handle, email decision.
