import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { Effect } from "effect"

import {
  createSandboxState,
  listSandboxStates,
  loadSandboxState,
} from "./store.js"

describe("sandbox store", () => {
  it("creates sandbox state with local and hosted env files", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "tskr-sandbox-store-"))

    try {
      const state = await Effect.runPromise(
        createSandboxState({
          emailFrom: "TSKR <noreply@localhost>",
          hostedDomainRoot: "sandboxes.example.com",
          name: "Feature Review 12",
          repositoryRoot: rootDirectory,
        })
      )

      expect(state.identity.slug).toBe("feature-review-12")
      expect(state.authSecret).toMatch(/^[A-Za-z0-9_-]{43,}$/u)

      const sandboxJson = await readFile(
        join(rootDirectory, ".sandbox", "feature-review-12", "sandbox.json"),
        "utf8"
      )
      const localComposeEnv = await readFile(
        join(
          rootDirectory,
          ".sandbox",
          "feature-review-12",
          "local",
          "compose.env"
        ),
        "utf8"
      )
      const hostedAuthEnv = await readFile(
        join(
          rootDirectory,
          ".sandbox",
          "feature-review-12",
          "hosted",
          "auth.env"
        ),
        "utf8"
      )

      expect([
        sandboxJson.includes('"slug": "feature-review-12"'),
        sandboxJson.includes('"authSecret": "'),
        localComposeEnv.includes("SANDBOX_MODE=local"),
        hostedAuthEnv.includes(`BETTER_AUTH_SECRET=${state.authSecret}`),
        hostedAuthEnv.includes(
          "BETTER_AUTH_URL=https://auth.feature-review-12.sandboxes.example.com"
        ),
      ]).toStrictEqual([true, true, true, true, true])
    } finally {
      await rm(rootDirectory, {
        force: true,
        recursive: true,
      })
    }
  })

  it("loads and lists saved sandbox state", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "tskr-sandbox-store-"))

    try {
      await Effect.runPromise(
        createSandboxState({
          emailFrom: "TSKR <noreply@localhost>",
          hostedDomainRoot: "sandboxes.example.com",
          name: "Feature Review 12",
          repositoryRoot: rootDirectory,
        })
      )

      const loaded = await Effect.runPromise(
        loadSandboxState({
          name: "Feature Review 12",
          repositoryRoot: rootDirectory,
        })
      )
      const listed = await Effect.runPromise(
        listSandboxStates({
          repositoryRoot: rootDirectory,
        })
      )

      expect(loaded.identity.slug).toBe("feature-review-12")
      expect(loaded.authSecret).toMatch(/^[A-Za-z0-9_-]{43,}$/u)
      expect(
        listed.map((sandbox: Awaited<typeof loaded>) => sandbox.identity.slug)
      ).toStrictEqual(["feature-review-12"])
      expect(listed[0]?.authSecret).toBe(loaded.authSecret)
    } finally {
      await rm(rootDirectory, {
        force: true,
        recursive: true,
      })
    }
  })
})
