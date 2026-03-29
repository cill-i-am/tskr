import { authClient } from "@/domains/identity/authentication/ui/auth-client"
import { acceptWorkspaceInvite } from "@/domains/workspaces/join-workspace/infra/accept-workspace-invite"
import {
  clearWorkspaceInviteFlow,
  persistWorkspaceInviteFlow,
} from "@/domains/workspaces/join-workspace/ui/workspace-invite-flow"
import { useForm, useStore } from "@tanstack/react-form"
import { useNavigate } from "@tanstack/react-router"
import { useEffectEvent, useState, useTransition } from "react"
import type { FormEvent } from "react"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import { FieldDescription, FieldGroup } from "@workspace/ui/components/field"
import {
  FormActions,
  FormMessage,
  FormTextField,
} from "@workspace/ui/components/form"

const joinWorkspaceCodeSchema = z.object({
  code: z.string().trim().min(1, "Invite code is required."),
})

interface JoinWorkspaceFormProps {
  initialCode?: string
  mode: "code" | "token"
  onRecoverableError: (
    message: string,
    inviteInput: { code: string } | { token: string }
  ) => boolean
  token?: string
}

const JoinWorkspaceForm = ({
  initialCode,
  mode,
  onRecoverableError,
  token,
}: JoinWorkspaceFormProps) => {
  const navigate = useNavigate()
  const session = authClient.useSession()
  const [error, setError] = useState<string | null>(null)
  const [isNavigating, startTransition] = useTransition()
  const form = useForm({
    defaultValues: {
      code: initialCode ?? "",
    },
    onSubmit: async ({ value }) => {
      setError(null)

      let inviteInput: { code: string } | { token: string } | null = null

      if (mode === "token") {
        inviteInput = token
          ? {
              token,
            }
          : null
      } else {
        inviteInput = {
          code: value.code.trim(),
        }
      }

      if (!inviteInput) {
        setError("This invite link is invalid.")
        return
      }

      if (!session.data) {
        persistWorkspaceInviteFlow(inviteInput)

        startTransition(() => {
          navigate({
            to: "/login",
          })
        })
        return
      }

      try {
        await acceptWorkspaceInvite(inviteInput)
      } catch (submissionError) {
        const message =
          submissionError instanceof Error
            ? submissionError.message
            : "Unable to join this workspace."

        if (onRecoverableError(message, inviteInput)) {
          return
        }

        setError("Unable to join this workspace right now.")
        return
      }

      clearWorkspaceInviteFlow()

      startTransition(() => {
        navigate({
          to: "/app",
        })
      })
    },
    validators:
      mode === "code"
        ? {
            onBlur: joinWorkspaceCodeSchema,
            onSubmit: joinWorkspaceCodeSchema,
          }
        : undefined,
  })
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const isDisabled = isSubmitting || isNavigating || session.isPending
  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await form.handleSubmit()
    }
  )

  return (
    <form className="gap-6 flex flex-col" noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        {mode === "code" ? (
          <form.Field name="code">
            {(field) => (
              <FormTextField
                autoCapitalize="characters"
                autoComplete="one-time-code"
                description="Paste the invite code from the email if you are joining without the signed link."
                disabled={isDisabled}
                field={field}
                label="Invite code"
                placeholder="ABCD1234"
                type="text"
              />
            )}
          </form.Field>
        ) : (
          <FieldDescription>
            This signed invite link already includes the workspace invite token.
            Continue to accept it.
          </FieldDescription>
        )}
        {error ? <FormMessage>{error}</FormMessage> : null}
        <FormActions>
          <Button disabled={isDisabled} type="submit">
            {isDisabled ? "Joining workspace..." : "Join workspace"}
          </Button>
        </FormActions>
      </FieldGroup>
    </form>
  )
}

export { JoinWorkspaceForm }
