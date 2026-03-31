# Electric service

`apps/electric` is the repo-owned boundary for the self-hosted Electric sync
service. It uses the official
[`electricsql/electric`](https://hub.docker.com/r/electricsql/electric) runtime
instead of vendoring Electric source into this repo.

This scaffold is intentionally standalone. It gives the repo a canonical
service layout, runtime contract, and local launch path before sandbox
integration lands in TSK-12.

## Files

- `Dockerfile` is a thin wrapper around the official Electric image. It sets the
  default HTTP port and persistent storage path used by this repo.
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

## Sources

- [Electric installation guide](https://electric-sql.com/docs/guides/installation)
- [Electric deployment guide](https://electric-sql.com/docs/guides/deployment)
- [Electric config reference](https://electric-sql.com/docs/api/config)
- [Official Electric quickstart compose example](https://electric-sql.com/docker-compose.yaml)
