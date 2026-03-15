# Railway Web Deployment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `web` app deployable on Railway from the monorepo root by adding a production start script, a lightweight healthcheck endpoint, and validating the exact build/start flow Railway will use.

**Architecture:** Keep Railway configured as a shared monorepo deployment. Build from the repo root with Turbo scoped to `web`, then run the `web` package directly with pnpm. Add a simple server route at `/up` for Railway health checks without introducing deeper readiness logic.

**Tech Stack:** pnpm workspaces, Turborepo, TanStack Start, Nitro, Vite, Railway, TypeScript

---

## Chunk 1: Production Runtime Script

### Task 1: Add a package-level `start` script for `web`

**Files:**

- Modify: `apps/web/package.json`
- Verify against: `apps/web/.output/server/index.mjs`

- [ ] **Step 1: Write the failing test condition**

Define the expected production command path: `pnpm --filter web start` should resolve to a real package script, but `apps/web/package.json` currently has no `start` script.

- [ ] **Step 2: Run a command that proves the failure**

Run: `pnpm --filter web start`

Expected: fail with a missing-script error for `start`.

- [ ] **Step 3: Add the minimal implementation**

Edit `apps/web/package.json` to add:

```json
{
  "scripts": {
    "start": "node .output/server/index.mjs"
  }
}
```

Keep the existing script style and ordering as close as possible to repo conventions.

- [ ] **Step 4: Re-run the command to verify the failure changed**

Run: `pnpm --filter web start`

Expected: it now fails later because the build output is missing, not because the script is missing. This proves the runtime entrypoint exists.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json
git commit -m "chore: add web runtime entrypoint"
```

## Chunk 2: Healthcheck Endpoint

### Task 2: Add a TanStack Start server route for `/up`

**Files:**

- Create: `apps/web/src/routes/up.ts`
- Generated output: `apps/web/src/routeTree.gen.ts`
- Reference: `apps/web/src/routes/index.tsx`

- [ ] **Step 1: Write the failing test condition**

Define the behavior: `GET /up` should return HTTP 200 with a minimal JSON body, but no such route exists in the current route tree.

- [ ] **Step 2: Run a focused verification step that proves the route is absent**

Start the app with an explicit local port and request `GET /up`.

Run in one terminal:

```bash
PORT=3000 pnpm --filter web start
```

Run in another terminal:

```bash
curl -i http://127.0.0.1:3000/up
```

Expected: 404 or route-not-found behavior.

- [ ] **Step 3: Add the minimal implementation**

Create `apps/web/src/routes/up.ts` with the exact route definition:

```ts
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/up")({
  server: {
    handlers: {
      GET: () => {
        return Response.json({ ok: true })
      },
    },
  },
})
```

Requirements:

- path must resolve to `/up`
- response must be fast and dependency-free
- status must be `200`
- body should stay minimal, for example `{ ok: true }`

If file-based route generation updates `apps/web/src/routeTree.gen.ts`, include that generated change in the same task, but do not hand-edit the generated file.

- [ ] **Step 4: Run the route generation or build path required by the app**

Run the minimum command needed so the route tree reflects the new route.

Prefer:

```bash
pnpm exec turbo run build --filter=web
```

Expected: the generated route tree now includes the `/up` route and the build completes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/up.ts apps/web/src/routeTree.gen.ts
git commit -m "feat: add web healthcheck route"
```

## Chunk 3: Railway-Equivalent Local Verification

### Task 3: Verify the exact build and runtime flow Railway will use

**Files:**

- Verify: `apps/web/package.json`
- Verify: `apps/web/src/routes/up.ts`

- [ ] **Step 1: Run the exact build command from the repo root**

Run: `pnpm exec turbo run build --filter=web`

Expected: pass and produce Nitro output under `apps/web/.output/`.

- [ ] **Step 2: Confirm the expected server entry exists**

Check that `apps/web/.output/server/index.mjs` exists.

Expected: file present.

- [ ] **Step 3: Run the exact runtime command from the repo root**

Run: `PORT=3000 pnpm --filter web start`

Expected: server starts successfully and binds to the provided port.

- [ ] **Step 4: Verify the healthcheck endpoint**

While the app is running, request `GET /up` locally.

Example command:

```bash
curl -i http://127.0.0.1:3000/up
```

Expected:

- HTTP 200
- JSON body containing `{ "ok": true }`

- [ ] **Step 5: Run required repo hygiene commands**

Run from repo root:

```bash
pnpm exec ultracite fix
pnpm exec oxfmt --write .
```

Then run the narrowest useful validation commands:

```bash
pnpm exec turbo run build --filter=web
pnpm --filter web typecheck
```

Expected: formatting succeeds and the focused validations pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/src/routes/up.ts apps/web/src/routeTree.gen.ts
git commit -m "feat: prepare web for railway deployment"
```
