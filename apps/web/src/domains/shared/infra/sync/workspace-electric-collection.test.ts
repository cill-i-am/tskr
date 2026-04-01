import { z } from "zod"

import {
  awaitWorkspaceElectricTxId,
  createWorkspaceElectricCollection,
  resolveWorkspaceElectricShapeOptions,
} from "./workspace-electric-collection"

describe("workspace electric collection", () => {
  it("creates a workspace-scoped electric collection with shared bootstrap helpers", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json(
          [
            {
              headers: {
                control: "up-to-date",
              },
            },
          ],
          {
            headers: {
              "electric-handle": "handle-1",
              "electric-offset": "0_0",
              "electric-schema": "[]",
              "electric-up-to-date": "true",
            },
            status: 200,
          }
        )
      )
      .mockResolvedValue(
        Response.json(
          [
            {
              headers: {
                control: "up-to-date",
              },
            },
          ],
          {
            headers: {
              "electric-cursor": "cursor-1",
              "electric-handle": "handle-1",
              "electric-offset": "0_0",
              "electric-schema": "[]",
              "electric-up-to-date": "true",
            },
            status: 200,
          }
        )
      )

    const fetchErrorSpy = vi.spyOn(console, "error").mockReturnValue()

    document.documentElement.dataset.apiBaseUrl = "http://api.internal:3001"

    const collection = createWorkspaceElectricCollection({
      collectionId: "workspace-members:workspace-123",
      getKey: (row) => row.id,
      resource: "/api/sync/workspaces/workspace-123/shapes/workspace-members",
      schema: z.object({
        id: z.string(),
        name: z.string(),
      }),
    })

    const shapeOptions = resolveWorkspaceElectricShapeOptions(
      "/api/sync/workspaces/workspace-123/shapes/workspace-members"
    )

    expect({
      awaitTxId: typeof collection.utils.awaitTxId,
      getKey: collection.config.getKey({
        id: "member-1",
        name: "Ada",
      }),
      id: collection.id,
      preload: typeof collection.preload,
      startSync: collection.config.startSync,
      syncMode: collection.config.syncMode,
      url: shapeOptions.url,
    }).toStrictEqual({
      awaitTxId: "function",
      getKey: "member-1",
      id: "workspace-members:workspace-123",
      preload: "function",
      startSync: true,
      syncMode: "eager",
      url: "http://api.internal:3001/api/sync/workspaces/workspace-123/shapes/workspace-members",
    })

    await shapeOptions.fetchClient(shapeOptions.url, {
      headers: shapeOptions.headers,
      method: "GET",
    })

    expect(fetchMock).toHaveBeenCalledWith(shapeOptions.url, {
      credentials: "include",
      headers: {
        accept: "application/json",
      },
      method: "GET",
    })

    expect(fetchErrorSpy).not.toHaveBeenCalled()

    await collection.preload()
    await collection.cleanup()

    delete document.documentElement.dataset.apiBaseUrl
  })

  it("awaits the numeric sync txid without coercing it", async () => {
    const awaitTxId = vi.fn().mockResolvedValue(true)
    const result = {
      syncConfirmation: {
        txid: 123,
      },
    }

    await expect(
      awaitWorkspaceElectricTxId(
        {
          utils: {
            awaitTxId,
          },
        } as never,
        result
      )
    ).resolves.toBe(result)

    expect(awaitTxId).toHaveBeenCalledWith(123)
  })
})
