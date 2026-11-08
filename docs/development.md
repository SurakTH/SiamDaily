# Development

This guide is for contributors (or future-you a few months later). Everything is vanilla JS — no transpiler, no bundler, no framework — so the fastest way to learn the code is to read it.

## Layout at a glance

```text
server.js                 Express backend: proxy / auth / monitoring (~1 file)
docs/                     architecture · security · deployment · api (this set)
public/
  index.html              app shell: sidebar nav + empty <div id="view-…"> hosts
  app.js                  AppCoordinator — tabs, clock, theme, palette, GPS, backup
  style.css               design system + 5 themes (CSS variables)
  sw.js / manifest.json   PWA offline cache + install
  views/<tab>.html        one template per tab (server-injected into the shell)
  components/<svc>.js     ES6 service classes that fetch /api and render
```

## How navigation works (important)

`server.js` reads `public/index.html` and, on first request, injects every `public/views/<name>.html` into its matching empty container. The page is then a **SPA**: `app.js` switches `active` classes on the containers by reading each button’s `data-tab` attribute. Because views are DOM-inserted once and never torn down, all their state and timers persist while the app is open.

## Adding a new tab (5 steps)

1. **Create the view** — `public/views/<name>.html`, containing your tab’s markup. Keep it self-contained; styles come from `style.css` classes (cards use the `.dashboard-card`, `.util-section`, etc. classes).
2. **Add a host container** — in `public/index.html` add `<div id="view-<name>" class="tab-pane"></div>` next to the other view divs (only one has `active`).
3. **Register the view** — add `'<name>'` to `VIEW_NAMES` in `server.js`. This makes the server inject your HTML.
4. **Add navigation** — a `.nav-item` (desktop sidebar) and/or `.mobile-nav-item` (mobile bottom nav) and/or `.bottom-sheet-item` button with `data-tab="<name>"`. `app.js` handles the rest: no per-tab wiring needed.
5. **Add data fetching** — if the tab calls `/api/*`, create/use a `public/components/*.js` class; mount it in `app.js` where the other services are initialized so it loads only when its tab becomes active.

## Adding a new API endpoint

1. Add the route in `server.js` after the other `/api/…` routes (keep the same style: `res.json({ success: true, … })`, SSRF guard if it touches user-supplied URLs, cache where sensible).
2. Validate it doesn’t introduce a security hole — read [`docs/security.md`](security.md) first; new outbound fetches **must** go through the SSRF check.
3. Document it in [`docs/api.md`](api.md) with a request/response example.
4. Mention it in `README.md` → *API* section count if the total changes.

## Conventions

- Formatting is enforced by the included `.prettierrc`:
  - 4-space indent, **single quotes**, semicolons, no trailing commas, `printWidth: 120`.
- Thai is hard-embedded in the UI text (auth messages, monitoring labels, etc.); keep that in the view/component where the English README/doc text lives in markdown.
- Follow the existing error-shape: JSON `{ success: false, message: '…' }`, HTTP 200 whenever the app handles it gracefully (the frontend reads `success`).
- Run `node --check <file>` after editing any JS (`server.js` or a `public/components/*.js`) before committing.

## Local run

```bash
npm install
npm start        # http://localhost:8000
```

No build step — the same files you edited are what the server serves.

## Testing the SSH security auditor without a real VPS

`parseAuthLog()` in `server.js` reads `/app/host-logs/auth.log` (bind-mounted in Docker). Locally you can simulate it:

```bash
mkdir -p host-logs
# append a few real failed-ssh lines like:
echo "$(date '+%b %e %H:%M:%S') vps sshd[123]: Failed password for invalid user root from 203.0.113.5 port 51234 ssh2" >> host-logs/auth.log
PORT=8000 node server.js
curl http://localhost:8000/api/monitoring/security-logs
```

When the file is missing/empty, the endpoint returns `simulated: true` with generated demo data — this also keeps the UI testable anywhere.

## Updating README screenshots

`PictureWebsite/Web1…Web6.png` are referenced from `README.md` as a showcase gallery. Replace them with your own captures; keep the filenames so the markdown keeps working. There is no need to photograph every tab — the feature **table** in README is the spec for the rest.

## Keep the repo clean

Before committing, run the leak check the maintainer uses before making it public:

```bash
git grep -InE 'BEGIN (RSA|OPENSSH) PRIVATE KEY|sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}'
git status --short
```

`data/` should never be staged (it is git-ignored).
