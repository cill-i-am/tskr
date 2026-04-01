# Railway Electric Service Runbook

Use this runbook when creating or repairing the hosted Electric service in
Railway.

## Create Or Link The Service

1. Create the service inside the existing product Railway project.
1. Set the service name to `electric`.
1. In the service settings, point Railway at `/apps/electric/railway.toml`.
1. Confirm the service is using the Dockerfile builder and the
   `apps/electric/Dockerfile` path from the config file.

Railway does not auto-discover subpath manifests, so the config file path must
be set explicitly.

## Configure Runtime

1. Attach the same environment/database scope as `api` and `auth`.
1. Set `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
1. Set a shared `ELECTRIC_SECRET` value and copy the same value into `api`.
1. Set `ELECTRIC_STORAGE_DIR=/var/lib/electric/persistent`.
1. Set `PORT=3000` so Railway routes traffic and health checks to Electric's
   fixed listener.
1. Leave `ELECTRIC_INSECURE` unset in Railway.
1. Keep the service port at `3000` so it matches the pinned
   `ELECTRIC_PORT=3000` in `apps/electric/Dockerfile`.

For private service-to-service access, set `api`'s `ELECTRIC_URL` to the
Electric private domain over HTTP, for example
`http://${{electric.RAILWAY_PRIVATE_DOMAIN}}:${{electric.PORT}}`.

## Attach Storage

1. Add a persistent volume to the Electric service.
1. Mount it at `/var/lib/electric/persistent`.
1. Keep in mind that Railway applies a small amount of downtime when a service
   with an attached volume redeploys.

The volume is required because Electric keeps shape storage on disk.

## Health And Rollout Checks

1. Redeploy the service after the config and volume are in place.
1. Confirm the deployment becomes healthy on `/v1/health`.
1. Check the logs for Electric binding on port `3000`.
1. Confirm `api` can reach Electric over the private network.
1. Confirm the shape cache survives a normal redeploy.

Expected health behavior:

- `/v1/health` should return HTTP 200 once Electric has started and can serve
  requests.
- The health check should fail if the service cannot reach Postgres or cannot
  start with its persistent storage path.
- If you change the Electric listener port, update `PORT`, `ELECTRIC_PORT`,
  and `api`'s `ELECTRIC_URL` together before redeploying.

## When Postgres Or Storage Change

If Postgres is replaced:

1. Update `DATABASE_URL` on Electric and `api`.
1. Replace the Electric volume if the old on-disk shape data should not be
   reused.
1. Redeploy Electric first, then verify health, then redeploy `api`.

If the Electric volume is replaced:

1. Expect Electric to rebuild its local shape state.
1. Verify the new volume mount works before cutting over traffic.
1. If the database also changed, treat the DB and volume replacement as one
   coordinated reset so the cached shape data and replication state stay in
   sync.

## What Good Looks Like

- The service has a config file path of `/apps/electric/railway.toml`.
- The service uses the Dockerfile builder and the repo-owned Electric image
  wrapper.
- The service passes health checks on `/v1/health`.
- `api` reaches Electric through private networking, not a public URL.
- The mounted volume persists across redeploys.
