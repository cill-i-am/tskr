import { z } from "zod"

const joinWorkspaceInviteCodeInputSchema = z
  .object({
    code: z.string(),
  })
  .strict()

const joinWorkspaceInviteTokenInputSchema = z
  .object({
    token: z.string(),
  })
  .strict()

const joinWorkspaceInviteFlowStateSchema = z.union([
  joinWorkspaceInviteCodeInputSchema,
  joinWorkspaceInviteTokenInputSchema,
])

type JoinWorkspaceInviteCodeInput = z.infer<
  typeof joinWorkspaceInviteCodeInputSchema
>
type JoinWorkspaceInviteTokenInput = z.infer<
  typeof joinWorkspaceInviteTokenInputSchema
>
type JoinWorkspaceInviteFlowState = z.infer<
  typeof joinWorkspaceInviteFlowStateSchema
>

export {
  joinWorkspaceInviteCodeInputSchema,
  joinWorkspaceInviteFlowStateSchema,
  joinWorkspaceInviteTokenInputSchema,
}
export type {
  JoinWorkspaceInviteCodeInput,
  JoinWorkspaceInviteFlowState,
  JoinWorkspaceInviteTokenInput,
}
