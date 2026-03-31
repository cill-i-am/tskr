import {
  buildPortlessAliasArgs,
  buildPortlessAliasName,
  buildPortlessRemoveAliasArgs,
} from "./portless.js"

describe("portless aliases", () => {
  it("builds stable alias names for sandboxed services", () => {
    expect(
      buildPortlessAliasName({
        service: "web",
        slug: "feature-review-12",
      })
    ).toBe("feature-review-12.web.tskr")
  })

  it("builds alias and remove commands", () => {
    expect(
      buildPortlessAliasArgs({
        name: "feature-review-12.web.tskr",
        port: 41_241,
      })
    ).toStrictEqual(["alias", "feature-review-12.web.tskr", "41241", "--force"])
    expect(
      buildPortlessRemoveAliasArgs("feature-review-12.web.tskr")
    ).toStrictEqual(["alias", "--remove", "feature-review-12.web.tskr"])
  })
})
