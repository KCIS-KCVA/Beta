# KCVA Multi-Sport Platform

A Vite multi-page static platform for KCVA volleyball, ultimate frisbee, and basketball events. Tailwind CSS is compiled at build time, event pages are discovered automatically, and each event remains a self-contained folder. Navigation, Shop, bilingual page titles, sponsorship packages, and leadership data are all static-first.

## Development

```bash
npm install
npm run dev
```

`http://localhost:5173/` opens the KCVA landing page. The primary event is at `http://localhost:5173/events/volleywoods-25-26/`. Shop is a local coming-soon page at `/shop`.

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
│   ├── data/events.index.json     # homepage + events list master index
│   └── assets/
│       ├── css/main.css           # compiled Tailwind output (committed)
│       └── js/{layout,i18n,events-data,home,events-list,event,share-poster,sponsorship,about}.js
├── src/
│   └── style.css                  # Tailwind + Carbon/HYROX source
├── events/
│   ├── index.html
│   ├── _template/
│   │   ├── index.html
│   │   ├── event-data.json
│   │   └── session-hero-image.png
│   └── volleywoods-25-26/
│       ├── index.html
│       ├── event-data.json
│       └── session-hero-image.png
├── about-kcva/
│   ├── index.html
│   └── leadership.json
├── sponsorship/index.html
├── 404.html
├── index.html
├── vite.config.ts
└── package.json
```

## Image quality standard

Homepage imagery is served from local assets with a fixed quality target rather than relying on source-image quality:

- Master JPEGs are capped at 1400px on the long edge.
- Responsive WebP variants are generated at 800px and 1400px where the master allows (quality 80–82); lower-resolution masters stay at native width, with the JPEG retained as a fallback.
- Markup uses `<picture>`, `srcset`, `sizes`, explicit dimensions, and `object-fit: cover`.
- Leadership portraits use a consistent 600 × 750 crop at JPEG quality 82.

## Vite asset rules

Files in `public/` are served from root, not from `/public/...`:

- Logo: `/images/logo.png`
- Favicon: `/favicon.png`
- Shared scripts: `/assets/js/...`
- Locales: `/locales/...`
- Events index: `/data/events.index.json`
- Event data and hero art are sibling-relative: `./event-data.json`, `./session-hero-image.png`.
- Event sponsor rail: fetched from `/data/sponsors.json` and rendered from the existing logos in `/images/`.
- The same sponsor logos are used by the Sponsorship page.

Every HTML page links `/assets/css/main.css`. That file is generated from `src/style.css` by the Tailwind CLI:

```bash
npm run css:build
```

`npm run dev` and `npm run build` run that step automatically via `predev` and `prebuild`.

The compiled CSS is committed so plain static preview servers (including the port-3000 preview) can serve the site without Vite. Root-level `assets`, `images`, `locales`, and `data` aliases mirror the canonical files in `public/`, and a root `favicon.png` mirror supports servers rooted at the repository directory.

## Vite multi-page build

`vite.config.ts` automatically discovers:

- `index.html`
- `events/index.html`
- `about-kcva/index.html`
- `sponsorship/index.html`
- `shop/index.html`
- `404.html`
- Every `events/*/index.html`

A build plugin copies `event-data.json` and `session-hero-image.png` from each event folder into the matching `dist/events/<slug>/` directory. It also copies `about-kcva/leadership.json` into `dist/about-kcva/`.

## Master events index

The homepage uses `public/data/events.index.json` for its hero image, and `/events/` uses it for the searchable event list. When adding an event, append its summary to that file:

```json
{
  "slug": "event-slug",
  "season": "25-26",
  "sport": "volleyball",
  "sportLabel": { "en": "VOLLEYBALL", "zh": "排球" },
  "title": { "en": "Event title", "zh": "赛事名称" },
  "subtitle": { "en": "Event subtitle", "zh": "赛事副标题" },
  "date": "2026-11-14",
  "dateLabel": "2026/11/14",
  "resultsReleaseDate": "2026-11-15T00:00:00+08:00",
  "venue": { "en": "Venue", "zh": "场馆" },
  "heroImage": "/events/event-slug/session-hero-image.png",
  "url": "/events/event-slug/",
  "statusOverride": null
}
```

`autoSeason` computes the academic varsity season and falls back to `currentSeason` when no indexed event belongs to the computed season. `statusOverride` accepts `scheduled`, `live`, or `completed`; otherwise status is derived from `date` and `resultsReleaseDate`. The homepage hero uses the first event's `heroImage`. The event list derives filters and calendar status from the same index.

## Creating a new event

1. Duplicate `events/_template/`.
2. Rename the copy to the new session slug.
3. Replace `session-hero-image.png`.
4. Edit `event-data.json`.
5. Add the event summary to `public/data/events.index.json`.
6. Commit. Cloudflare Pages rebuilds and deploys automatically.

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

## Standings formats

The event detail table and generated poster support three sports:

- Volleyball: sets and points.
- Ultimate frisbee: diff, SOTG, and points.
- Basketball: PF, PA, +/-, and PTS. Provide `pf`, `pa`, optional `diff`, and `points` on each basketball row.

## Standings JPG poster

The Share button beside each completed division creates a 1080 × 1350 JPG using Canvas 2D only, with no external image service. The poster preview modal offers:

- Share Now via `navigator.share({ files: [...] })` when supported.
- Automatic download plus toast when file sharing is unavailable.
- Download JPG with `download="kcva-volleywoods-boys-results.jpg"` (division name changes per table).

## About leadership

`/about-kcva/leadership.json` is the single source for the leadership grid. The page fetches it at runtime, localizes `role.en` / `role.zh`, and renders all members in a responsive 2/4-column card grid.

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

The committed `/assets/css/main.css`, root asset aliases, root `/data` alias, and root favicon mirror make this preview work without the Vite dev server. For normal development, `npm run dev` remains preferred because it rebuilds Tailwind CSS and provides HMR.
