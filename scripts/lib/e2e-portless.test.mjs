import assert from "node:assert/strict"
import test from "node:test"

import {
  assertHttpsPortlessServiceUrls,
  resolvePortlessServiceUrl,
  resolvePortlessServiceUrls,
} from "./e2e-portless.mjs"

test("resolvePortlessServiceUrl finds a base e2e service URL", () => {
  const output = `
NAME           URL
e2e-web.tskr   https://e2e-web.tskr.localhost:1355
e2e-auth.tskr  https://e2e-auth.tskr.localhost:1355
`

  assert.equal(
    resolvePortlessServiceUrl(output, "e2e-web.tskr"),
    "https://e2e-web.tskr.localhost:1355"
  )
  assert.equal(
    resolvePortlessServiceUrl(output, "e2e-auth.tskr"),
    "https://e2e-auth.tskr.localhost:1355"
  )
})

test("resolvePortlessServiceUrl finds a worktree-prefixed e2e service URL", () => {
  const output = `
NAME                     URL
feature-x.e2e-web.tskr   https://feature-x.e2e-web.tskr.localhost:1355
feature-x.e2e-auth.tskr  https://feature-x.e2e-auth.tskr.localhost:1355
`

  assert.equal(
    resolvePortlessServiceUrl(output, "e2e-web.tskr"),
    "https://feature-x.e2e-web.tskr.localhost:1355"
  )
  assert.equal(
    resolvePortlessServiceUrl(output, "e2e-auth.tskr"),
    "https://feature-x.e2e-auth.tskr.localhost:1355"
  )
})

test("resolvePortlessServiceUrl ignores similarly named non-e2e routes", () => {
  const output = `
NAME                 URL
web.tskr             https://web.tskr.localhost:1355
feature.web.tskr     https://feature.web.tskr.localhost:1355
e2e-web.tskr         https://e2e-web.tskr.localhost:1355
`

  assert.equal(
    resolvePortlessServiceUrl(output, "e2e-web.tskr"),
    "https://e2e-web.tskr.localhost:1355"
  )
})

test("resolvePortlessServiceUrls returns both required service URLs", () => {
  const output = `
https://feature-x.e2e-web.tskr.localhost:1355
https://feature-x.e2e-auth.tskr.localhost:1355
`

  assert.deepEqual(resolvePortlessServiceUrls(output), {
    authBaseUrl: "https://feature-x.e2e-auth.tskr.localhost:1355",
    webBaseUrl: "https://feature-x.e2e-web.tskr.localhost:1355",
  })
})

test("resolvePortlessServiceUrls accepts http routes from portless list", () => {
  const output = `
Active routes:

  http://e2e-web.tskr.localhost:1355  ->  localhost:4427  (pid 14453)
  http://e2e-auth.tskr.localhost:1355  ->  localhost:4822  (pid 14536)
`

  assert.deepEqual(resolvePortlessServiceUrls(output), {
    authBaseUrl: "http://e2e-auth.tskr.localhost:1355",
    webBaseUrl: "http://e2e-web.tskr.localhost:1355",
  })
})

test("assertHttpsPortlessServiceUrls rejects non-https portless routes", () => {
  assert.throws(
    () =>
      assertHttpsPortlessServiceUrls({
        authBaseUrl: "http://e2e-auth.tskr.localhost:1355",
        webBaseUrl: "http://e2e-web.tskr.localhost:1355",
      }),
    /Portless proxy must run in HTTPS mode/u
  )
})
