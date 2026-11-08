# Deployment

SiamDaily is designed to run in a single Docker container, but it also runs fine with plain Node.js. Docker is preferred because it bakes in the exact runtime (`node:20-alpine`) plus the `docker-cli` binary the VPS Control Panel needs.

## Prerequisites

- **Node.js ≥ 18** for local runs, or **Docker + Docker Compose** for containerized deployment.
- For the **SSH Security Auditor**: a host with an auth log (`/var/log/auth.log`) that can be bind-mounted into the container. Without it, the Monitoring tab gracefully falls back to simulated demo data.

## Option A — Run locally

```bash
git clone <this-repo>
cd SiamDaily
npm install
npm start            # → http://localhost:8000
```

## Option B — Docker Compose (recommended)

```bash
docker compose up -d --build
# → http://localhost:8000
```

What `docker-compose.yml` sets up:

| Item | Detail |
|---|---|
| Image | built from `Dockerfile` — `node:20-alpine` + `docker-cli` |
| Port | `8000:8000` |
| Environment | `PORT=8000`, `NODE_ENV=production` |
| Volumes | `./data` → `/app/data` (persistent user datastore) · `/var/run/docker.sock` **`:ro`** (VPS panel) · `/var/log/auth.log` **`:ro`** → `/app/host-logs/auth.log` (SSH auditor) |
| Networking | `host.docker.internal:host-gateway` so host services (e.g. port checks) are reachable |
| Healthcheck | HTTP GET `/health` every 30s, 10s timeout, 3 retries, 10s start period |

## Configuration (environment variables)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | HTTP listen port |
| `NODE_ENV` | `production` | Node runtime environment |
| `REGISTRATION_OPEN` | `true` | `false` disables new account signups |
| `REGISTRATION_KEY` | _(empty)_ | when set, new signups must present this key |

## Deploy to your server (rsync + Compose)

1. `cp deploy.example.sh deploy.sh`
2. Edit these lines to match your server (do **not** commit `deploy.sh`):

   ```bash
   VPS_USER="your-username"
   VPS_HOST="your-server.example.com"
   VPS_PATH="~/docker/siam-daily"
   ```

3. Run it:

   ```bash
   ./deploy.sh
   ```

   The script:
   - creates `$VPS_PATH/data` and an empty `users.json` if missing,
   - **rsyncs** the code, excluding `node_modules`, `.git`, and `data` (your local data does not overwrite the server's),
   - rebuilds and restarts the container with `docker compose up -d --build`.

## Post-deploy checklist

- [ ] `curl http://<host>:8000/health` returns an OK payload
- [ ] Login + the Account tab show a working Cloud Sync
- [ ] Monitoring tab shows real failed SSH counts (if you mounted `auth.log`) or simulated data otherwise
- [ ] VPS Control Panel lists your containers (requires the socket mount)
- [ ] Put the container **behind a reverse proxy (Caddy/Nginx) with TLS** for production use — the app sets `trust proxy` already, but plain HTTP should not be exposed to the internet

## Backups

The only stateful data is the JSON datastore in `./data`. Back it up with anything that copies files; restore by placing the files back and restarting:

```bash
cp -r ./data ./data.bak.$(date +%F)          # backup
docker compose restart                        # apply restored data
```

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Monitoring shows simulated data | `auth.log` mount missing; check `/var/log/auth.log` exists and `:ro` mount is present |
| VPS panel empty | Docker socket not mounted, or the container lacks `docker-cli` |
| Images/external URLs blocked in debug | SSRF guard rejecting private/link-local targets by design — see `docs/security.md` |
| Port already bound | change `PORT` on both sides of the `ports:` mapping in `docker-compose.yml` |
