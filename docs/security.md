# Security

This app is designed to sit on a public VPS with a real hostname, so hardening is a first-class concern — not an afterthought. Everything below is implemented in `server.js` / the frontend; verify and extend as you see fit before deploying publicly.

## Network layer

| Control | What it does |
|---|---|
| `helmet` | Sets secure HTTP headers (HSTS, X-Content-Type-Options, frame-ancestors, etc.). CSP is **disabled** deliberately — the dashboard must be able to render arbitrary user-chosen external images (wallpapers, service logos). |
| `app.set('trust proxy', 1)` | Correctly reads `X-Forwarded-For` so rate limiting and logs see the real client IP behind a reverse proxy. |
| `cors` | **Same-origin only.** The delegate compares `Origin.host` against the request `Host` header and refuses anything else. |
| `express-rate-limit` | `3000` requests / 15 minutes per IP across `/api/` — generous for a heavy dashboard but still blocks abuse loops. |

## SSRF protection (outbound proxies)

Any endpoint that fetches user-supplied URLs receives a layered check. A shared `isPrivateIp()` validator covers **IPv4, IPv6, and IPv4-mapped IPv6** (`::ffff:`), blocking loopback, RFC1918 private ranges, link-local, and unique-local addresses.

Before the request is forwarded the code also:
1. **Resolves the domain via `dns`** first — so a hostname pointing at a private IP can’t slip past an allowlist (DNS-rebinding defense), and
2. **Hard-blocks cloud metadata addresses** (e.g. `169.254.169.254`), plus any resolved private target, unless it is an explicit loopback / Docker-host exception needed for local services.

These guards wrap the **image proxy**, the **radio proxy**, **service-link pings** (`/api/services/ping`), the **network diagnostics** endpoints (ping/DNS/port), and **custom RSS feed URLs**.

## Auth & datastore

- **Hashing** — PBKDF2, **100,000 iterations, SHA-512, 64-byte key**, per-user random salt. On login, legacy hashes are **transparently upgraded** to PBKDF2, so no user is ever locked out by a migration.
- **Sessions** — opaque random bearer tokens with a 30-day expiry, stored per-user. A user is capped at **10 active devices/sessions** (oldest evicted) to prevent token sprawl; any session can be revoked remotely from the Account tab.
- **Audit trail** — the last 20 login events (IP, user agent, timestamp) are kept per user and shown in the Account tab.
- **Registration lockdown** — signups can be disabled entirely (`REGISTRATION_OPEN=false`) or gated behind a shared key (`REGISTRATION_KEY`).
- **Prototype-pollution defense** — every lookup uses `Object.prototype.hasOwnProperty.call(...)` instead of `if (db.users[name])`, and a reserved-name blocklist (`__proto__`, `constructor`, `prototype`, `tostring`, `valueof`) prevents key-confusion attacks.
- **Atomic writes** — the JSON datastore is written via serialize-then-rename, so a crash mid-write can’t corrupt `data/users.json`.

## XSS & input handling

- User-created content (bookmarks, todos, wallpaper URLs) is rendered as **DOM text** or **escaped HTML**, never injected raw.
- News items are rendered through DOM text assignment instead of template-string HTML, preventing stored-XSS vectors from feed content.
- Outbound HTTP requests carry a **browser-like User-Agent** and cap with timeouts, since many Thai upstream APIs reject non-browser clients.

## Safe process execution

Host commands are run only through `execFile` (no shell, no string interpolation) — argv arrays are passed directly:

- `ping` (diagnostics/`/api/diagnostics/ping`)
- DNS lookup, port check
- `df -h /` (VPS disk gauge)
- `docker ps` (VPS Control Panel container list)

Because no route ever builds a shell command from user input, command injection has no path into the process.

## Resource-exhaustion limits

- **Speedtest download** — generated asynchronously into a buffer, default 5&nbsp;MB, **capped at 20&nbsp;MB**, and the rejection path destroys the client stream early.
- **Speedtest upload** — stream-based with a **25&nbsp;MB hard cap** that aborts and destroys the request on overflow.
- **Fast-abort on client disconnect** — aborts upstream fetches/downloads instead of letting them run to completion.
- **Global exception handlers** — uncaught rejections/errors are logged and routed to a safe JSON error response instead of crashing (or leaking stack traces).

## Docker socket exposure

The control panel lists running containers, which requires the Docker socket:

- It is mounted **read-only (`:ro`)** in `docker-compose.yml`.
- The server only ever runs `docker ps --format …` on it — **no route** forwards arbitrary Docker API calls.
- Keep the caveat in mind regardless: mounting the socket is equivalent to giving the container root powers over the host Docker daemon, so treat the container as host-trusted. Remove the mount if you don’t need the VPS panel.

## What is NOT in the repo

- `data/` (user accounts, sessions, scrapers, geo cache) is **git-ignored** and never committed.
- No API keys, private keys, or VPS host/path details appear in version control — see `deploy.example.sh` (placeholder values only).
