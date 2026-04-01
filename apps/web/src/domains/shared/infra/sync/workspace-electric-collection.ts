import { resolveApiServiceUrl } from "@/domains/shared/infra/api-service-client"
import { snakeCamelMapper } from "@electric-sql/client"
import { electricCollectionOptions } from "@tanstack/electric-db-collection"
import type { ElectricCollectionUtils } from "@tanstack/electric-db-collection"
import { createCollection } from "@tanstack/react-db"
import type { Collection } from "@tanstack/react-db"
import type { z } from "zod"

const fetchWorkspaceElectricShape: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    credentials: "include",
  })

type WorkspaceElectricRowSchema = z.ZodObject<z.ZodRawShape>

type WorkspaceElectricCollection<TSchema extends WorkspaceElectricRowSchema> =
  Collection<
    z.infer<TSchema>,
    string,
    ElectricCollectionUtils<z.infer<TSchema>>
  >

const resolveWorkspaceElectricShapeOptions = (resource: string) => ({
  columnMapper: snakeCamelMapper(),
  fetchClient: fetchWorkspaceElectricShape,
  headers: {
    accept: "application/json",
  },
  url: resolveApiServiceUrl(resource),
})

const createWorkspaceElectricCollection = <
  TSchema extends WorkspaceElectricRowSchema,
>({
  collectionId,
  getKey,
  resource,
  schema,
}: {
  collectionId: string
  getKey: (item: z.infer<TSchema>) => string
  resource: string
  schema: TSchema
}): WorkspaceElectricCollection<TSchema> =>
  createCollection(
    electricCollectionOptions({
      getKey: getKey as (item: Record<string, unknown>) => string | number,
      id: collectionId,
      schema,
      shapeOptions: resolveWorkspaceElectricShapeOptions(resource),
      startSync: true,
      syncMode: "eager",
    }) as never
  ) as unknown as WorkspaceElectricCollection<TSchema>

type AnyWorkspaceElectricCollection = Pick<
  WorkspaceElectricCollection<WorkspaceElectricRowSchema>,
  "cleanup" | "preload"
>

const preloadWorkspaceElectricCollections = async (
  collections: AnyWorkspaceElectricCollection[]
) => {
  await Promise.all(collections.map((collection) => collection.preload()))
}

const cleanupWorkspaceElectricCollections = async (
  collections: AnyWorkspaceElectricCollection[]
) => {
  await Promise.all(collections.map((collection) => collection.cleanup()))
}

const awaitWorkspaceElectricTxId = async <
  TResult extends {
    syncConfirmation: {
      txid: string
    }
  },
>(
  collection: Pick<
    WorkspaceElectricCollection<WorkspaceElectricRowSchema>,
    "utils"
  >,
  result: TResult
) => {
  const txId = Number(result.syncConfirmation.txid)

  if (!Number.isSafeInteger(txId)) {
    throw new TypeError(
      `Workspace sync confirmation txid must be a safe integer, received ${result.syncConfirmation.txid}.`
    )
  }

  await collection.utils.awaitTxId(txId)

  return result
}

export {
  awaitWorkspaceElectricTxId,
  cleanupWorkspaceElectricCollections,
  createWorkspaceElectricCollection,
  preloadWorkspaceElectricCollections,
  resolveWorkspaceElectricShapeOptions,
}
export type { WorkspaceElectricCollection }
