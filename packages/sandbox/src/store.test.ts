import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
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
      const localElectricEnv = await readFile(
        join(
          rootDirectory,
          ".sandbox",
          "feature-review-12",
          "local",
          "electric.env"
        ),
        "utf8"
      )
      const hostedElectricEnvPath = join(
        rootDirectory,
        ".sandbox",
        "feature-review-12",
        "hosted",
        "electric.env"
      )
      const hostedElectricEnvExists = await access(hostedElectricEnvPath).then(
        () => true,
        () => false
      )

      expect(sandboxJson).toContain('"slug": "feature-review-12"')
      expect(localComposeEnv).toContain("SANDBOX_MODE=local")
      expect(
        ["SANDBOX_ENV_ELECTRIC_FILE=", "SANDBOX_ELECTRIC_PORT="].every(
          (entry) => localComposeEnv.includes(entry)
        )
      ).toBeTruthy()
      expect([
        localElectricEnv.includes("ELECTRIC_INSECURE=true"),
        hostedAuthEnv.includes(
          "BETTER_AUTH_URL=https://auth.feature-review-12.sandboxes.example.com"
        ),
        hostedElectricEnvExists,
      ]).toStrictEqual([true, true, false])
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
      expect(
        listed.map((sandbox: Awaited<typeof loaded>) => sandbox.identity.slug)
      ).toStrictEqual(["feature-review-12"])
    } finally {
      await rm(rootDirectory, {
        force: true,
        recursive: true,
      })
    }
  })

  it("removes stale hosted electric env files when sandbox state is recreated", async () => {
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

      const hostedElectricEnvPath = join(
        rootDirectory,
        ".sandbox",
        "feature-review-12",
        "hosted",
        "electric.env"
      )

      await writeFile(hostedElectricEnvPath, "stale=true\n", "utf8")

      await Effect.runPromise(
        createSandboxState({
          emailFrom: "TSKR <noreply@localhost>",
          hostedDomainRoot: "sandboxes.example.com",
          name: "Feature Review 12",
          repositoryRoot: rootDirectory,
        })
      )

      const hostedElectricEnvExists = await access(hostedElectricEnvPath).then(
        () => true,
        () => false
      )

      expect(hostedElectricEnvExists).toBeFalsy()
    } finally {
      await rm(rootDirectory, {
        force: true,
        recursive: true,
      })
    }
  })
})
