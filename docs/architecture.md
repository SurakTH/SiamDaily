# Architecture

SiamDaily is a **self-contained Node.js + Express single-page dashboard** with zero frontend build step. The whole app runs in one process (optionally one Docker container) and has no external database at runtime — state lives in flat JSON files.

## High-level layout

```
┌──────────────────────────────────────────────────────────────────┐
│                            server.js                             │
│  Express app                                                     │
│   ├── GET /                  assembles all views into the shell  │
│   ├── /api/*                 ~35 routes: proxy / auth / monitor  │
│   ├── background poller      news every 10 min                   │
│   └── datastore              data/users.json (atomic writes)     │
└───────────────┬──────────────────────────────────────────────────┘
                │ serves public/ (static) + assembled HTML
┌───────────────▼──────────────────────────────────────────────────┐
│                          frontend (PWA)                          │
│  index.html        app shell: sidebar, header, empty view hosts  │
│  app.js            AppCoordinator — tabs, clock, theme, palette, │
│                    GPS, backup/restore, session UI               │
│  views/*.html      12 server-side template views (one per tab)   │
│  components/*.js   ES6 service classes (data fetch + rendering)  │
│  style.css         design system + themes (CSS variables)        │
│  sw.js / manifest  offline cache + installability                │
└──────────────────────────────────────────────────────────────────┘
```

## Request lifecycle

1. **Boot** — `server.js` reads `public/index.html` (the shell) once.
2. **First page load** — `buildAssembledHtml()` loops over every entry in `VIEW_NAMES`, reads `public/views/<name>.html`, and injects the content into its matching empty container (`<div id="view-<name>" class="tab-pane">…</div>`). The fully-assembled HTML is cached in `assembledHtml` for the life of the process.
3. **Navigation (SPA)** — the browser only ever loads that one assembled page. `app.js` (`AppCoordinator`) switches tabs by toggling the `active` class on the injected containers, so component state, timers, and event bindings survive navigation. No layout shift, no full reload.
4. **Data** — each `public/components/*.js` class fetches from the app's own `/api/*` routes and renders into its view. The backend never exposes upstream keys/URLs to the browser.

## Tabs ⇄ views ⇄ components

| Tab (view file)        | Responsible frontend class |
|------------------------|----------------------------|
| `dashboard.html`       | (coordinated in `app.js`)   |
| `weather.html`         | `weather.js`                |
| `traffic.html`         | `traffic.js`                |
| `oil.html`             | `finance.js` (gold/oil)     |
| `news.html`            | `news.js`                   |
| `utilities.html`       | `utilities.js`, `tools.js`, `lifestyle.js` |
| `emergency.html`       | `tools.js` / inline         |
| `services.html`        | `services.js`               |
| `monitoring.html`      | `monitoring.js`             |
| `health.html`          | `health.js`, `ambient.js`   |
| `budget.html`          | `finance.js`                |
| `account.html`         | `app.js` (auth/sync UI)     |

## Backend API proxy pattern

Most endpoints follow the same shape:

```
Frontend component ──GET /api/oil──▶ server.js
                                      │ 1. check in-memory cache (5 min)
                                      │ 2. fetch upstream (axios, spoofed UA,
                                      │    timeout, SSRF-guarded)
                                      │ 3. normalize into a small JSON schema
                                      ▼ 4. cache + respond
                                  { success, product, price, date, … }
```

Upstreams hit this way include the Thai Gold Association (scraped with `cheerio`, plus a fallback source and an offline mock), Bangchak & PTT for fuel, Binance for crypto, Sanook RSS for news, and Open-Meteo is proxied by the weather component directly.

## Datastore

- `data/users.json` — JSON file datastore, keyed by lower-cased username.
- Each user holds: PBKDF2-hashed password, `data` blob (notes, budget, todos, layout, wallpaper, habits, bookmarks — the whole cloud-sync payload), active session tokens (max **10**), and a login-history audit trail (last **20**).
- EVERY write goes through one function that serializes and **atomically** replaces the file to avoid corruption on crash.
- `data/` is **git-ignored** — it never leaves the host. In Docker it is a bind-mounted volume (`./data`).
- Smaller supporting stores: `data/scrapers.json` (web-scrape alert bots), `data/geo_cache.json` (IP→geo cache for the SSH auditor).

## Background work

- **News poller** — refreshes Thai RSS feeds every 10 minutes into an in-memory cache so `/api/news` is served instantly and upstream load stays low.
- Scraper bots run on demand (their own interval per bot) and fire Discord/LINE/Telegram webhooks when a watched selector changes.

## PWA / offline

- `sw.js` uses a cache-first strategy for the static shell (HTML/CSS/JS/views already baked in), with network fallback for `/api/*`. `skipWaiting` + `clients.claim` keep the service worker current.
- `manifest.json` provides installability with standalone display and a themed icon.

## Why “no framework”

- Vanilla ES6 modules + server-side view assembly keep the bundle tiny and the page snappy on low-end phones (a core use case).
- Every tab is a separate `.html`/`.js` file, so contributors can edit one screen without touching global build tooling.
