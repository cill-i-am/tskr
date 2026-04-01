# Electric service

`apps/electric` is the repo-owned boundary for the self-hosted Electric sync
service. It uses the official
[`electricsql/electric`](https://hub.docker.com/r/electricsql/electric) runtime
instead of vendoring Electric source into this repo.

This scaffold is intentionally standalone. It gives the repo a canonical
service layout, runtime contract, and local launch path before hosted Railway
integration and sandbox wiring land together.

## Files

- `Dockerfile` is a thin wrapper around the official Electric image. It sets the
  default HTTP port and persistent storage path used by this repo.
- `railway.toml` is the Railway config-as-code file for the hosted Electric
  service.
- `compose.yaml` runs Electric in front of a local Postgres with logical
  replication enabled so the service can be started and checked in isolation.
- `.env.example` documents the expected environment surface and the dev-only
  insecure defaults.

## Runtime contract

Electric is a separate HTTP service that sits in front of Postgres.

Required and expected environment:

- `DATABASE_URL` points Electric at Postgres.
- `ELECTRIC_SECRET` is the production authentication secret for the HTTP API.
- `ELECTRIC_INSECURE=true` is a development-only shortcut when a secret is not
  configured.
- `ELECTRIC_PORT` controls the HTTP listener and defaults to `3000`.
- `ELECTRIC_STORAGE_DIR` points at persistent on-disk shape storage and must
  survive service restarts.

Hosted Railway expectations:

- The Electric service should use `/apps/electric/railway.toml` as its config
  file path in Railway.
- The service should be built with the Dockerfile builder and
  `apps/electric/Dockerfile` as the Dockerfile path.
- The service health check should target `/v1/health`.
- `ELECTRIC_INSECURE` should stay unset in Railway.
- The API should talk to Electric over Railway private networking, not through
  a public domain.
- `ELECTRIC_URL` in `apps/api` should point at the Electric private domain and
  the service `PORT`, for example
  `http://${{electric.RAILWAY_PRIVATE_DOMAIN}}:${{electric.PORT}}`.
- Set Railway's `PORT=3000` because Electric listens on its own fixed
  `ELECTRIC_PORT` rather than Railway's injected dynamic port.
- If you ever change `ELECTRIC_PORT`, keep `PORT`, `ELECTRIC_PORT`, and the API
  `ELECTRIC_URL` port in sync with it.

Operational endpoints and conventions:

- Health endpoint: `/v1/health`
- Default HTTP port: `3000`
- Repo storage convention: mount persistent storage at
  `/var/lib/electric/persistent`
- Repo image convention: pin the Electric image tag and digest in `Dockerfile`
  so local and CI builds stay reproducible.

## Local scaffold

From `apps/electric`:

```bash
docker compose --env-file .env.example up --build -d
curl http://localhost:3000/v1/health
docker compose --env-file .env.example down
```

The compose example creates:

- `postgres_data` for the local Postgres data directory
- `electric_storage` for Electric's persistent shape cache

Those named volumes are the local stand-in for the persistent disk or mounted
volume that a hosted deployment will need.

The published ports bind to `127.0.0.1` by default so the insecure local stack
is only reachable from the host machine. If you need to run multiple worktrees
at once, set a unique `COMPOSE_PROJECT_NAME` before starting the stack.

## Development vs production

`.env.example` defaults to `ELECTRIC_INSECURE=true` because this scaffold is
meant to be runnable before sandbox and hosted wiring exist. That mode is for
development only.

For production or any internet-reachable deployment:

- remove `ELECTRIC_INSECURE`
- set a strong `ELECTRIC_SECRET`
- keep `ELECTRIC_STORAGE_DIR` on persistent storage
- keep the storage contents aligned with the same `DATABASE_URL`

If you point Electric at a different database or move `ELECTRIC_STORAGE_DIR`,
clean up the old on-disk shape data and the old replication slot/publication
state together so Electric does not restart against mismatched state.

When the hosted service is deployed on Railway, attach a persistent volume and
mount it at `/var/lib/electric/persistent`. That volume is the hosted
replacement for the local named volume used in `compose.yaml`.

## Sources

- [Electric installation guide](https://electric-sql.com/docs/guides/installation)
- [Electric deployment guide](https://electric-sql.com/docs/guides/deployment)
- [Electric config reference](https://electric-sql.com/docs/api/config)
- [Official Electric quickstart compose example](https://electric-sql.com/docker-compose.yaml)
