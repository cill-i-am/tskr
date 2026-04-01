export const ELECTRIC_DEFAULT_PUBLICATION_NAME = "electric_publication_default"

export const SYNCED_AUTH_REPLICATION_TABLES = [
  "auth.organization",
  "auth.member",
  "auth.invitation",
] as const

export type SyncedAuthReplicationTable =
  (typeof SYNCED_AUTH_REPLICATION_TABLES)[number]
