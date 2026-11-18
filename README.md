# KCVA Multi-Sport Platform

A Vite multi-page static platform for KCVA volleyball and ultimate frisbee events. Tailwind CSS is compiled at build time, event pages are discovered automatically, and each event remains a self-contained folder.

## Development

```bash
npm install
npm run dev
```

`http://localhost:5173/` opens the KCVA landing page. The primary event is at `http://localhost:5173/events/volleywoods-25-26/`.

Production build:

```bash
npm run build
npm run preview
```

The build output is `dist/`.

## Directory structure

```text
repo-root/
├── public/
│   ├── _redirects
│   ├── favicon.png
│   ├── images/logo.png
│   ├── locales/{en,zh}.json
│   └── assets/
│       ├── css/main.css           # compiled Tailwind output (committed)
│       └── js/{layout,i18n,event,share-poster}.js
├── src/
│   └── style.css                  # Tailwind + Carbon/HYROX source
├── events/
│   ├── index.html
│   ├── _template/
│   │   ├── index.html
│   │   ├── event-data.json
│   │   ├── session-hero-image.png
│   │   └── sponsors.png
│   └── volleywoods-25-26/
│       ├── index.html
│       ├── event-data.json
│       ├── session-hero-image.png
│       └── sponsors.png
├── about/index.html
├── media-hub/index.html
├── sponsorship/index.html
├── 404.html
├── index.html
├── vite.config.ts
└── package.json
```

## Vite asset rules

Files in `public/` are served from root, not from `/public/...`:

- Logo: `/images/logo.png`
- Favicon: `/favicon.png`
- Shared scripts: `/assets/js/...`
- Locales: `/locales/...`
- Event assets are sibling-relative: `./event-data.json`, `./session-hero-image.png`, `./sponsors.png`.

Every HTML page links `/assets/css/main.css`. That file is generated from `src/style.css` by the Tailwind CLI:

```bash
npm run css:build
```

`npm run dev` and `npm run build` run that step automatically via `predev` and `prebuild`.

The compiled CSS is committed so plain static preview servers (including the port-3000 preview) can serve the site without Vite. Root-level `assets`, `images`, and `locales` aliases mirror the canonical files in `public/`, and a root `favicon.png` mirror supports servers rooted at the repository directory.

## Vite multi-page build

`vite.config.ts` automatically discovers:

- `index.html`
- `events/index.html`
- `about/index.html`
- `media-hub/index.html`
- `sponsorship/index.html`
- `404.html`
- Every `events/*/index.html`

A build plugin copies `event-data.json`, `session-hero-image.png`, and `sponsors.png` from each event folder into the matching `dist/events/<slug>/` directory. The same relative URLs therefore work in dev and production.

## Creating a new event

1. Duplicate `events/_template/`.
2. Rename the copy to the new session slug.
3. Replace `session-hero-image.png` and `sponsors.png`.
4. Edit `event-data.json`.
5. Commit. Cloudflare Pages rebuilds and deploys automatically.

No page-shell edits are required.

## Action button rules

A button only renders as an `<a>` with an active style when it has a non-empty URL **and** its time/status condition is true. Otherwise it renders as a disabled `<button>`.

- Player Registration: scheduled and before the registration deadline. `?status=scheduled` forces the active preview state.
- Volunteer Registration: empty URL, therefore disabled.
- Buy Tickets: empty URL, therefore disabled.
- Watch Game Replay: empty URL, therefore disabled.
- Live Photo Gallery: enabled during live and completed states, using the solid style when replay is unavailable.

Status is recalculated from ISO deadlines and can be previewed with:

```text
/events/volleywoods-25-26/?status=scheduled
/events/volleywoods-25-26/?status=live
/events/volleywoods-25-26/?status=completed
```

## Standings JPG poster

The Share button beside each completed division creates a 1080 × 1350 JPG using Canvas 2D only, with no external image service. The poster preview modal offers:

- Share Now via `navigator.share({ files: [...] })` when supported.
- Automatic download plus toast when file sharing is unavailable.
- Download JPG with `download="kcva-volleywoods-boys-results.jpg"` (division name changes per table).

## Cloudflare Pages

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `dist`
- No environment variables required

`public/_redirects` uses clean static routes, so built event pages and their sibling JSON/PNG files are served directly.

## Plain static preview

The repository can also be opened through a simple static server rooted at the repo:

```bash
python3 -m http.server 3000
```

The committed `/assets/css/main.css`, root asset aliases, and root favicon mirror make this preview work without the Vite dev server. For normal development, `npm run dev` remains preferred because it rebuilds Tailwind CSS and provides HMR.
