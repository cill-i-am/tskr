import { createWorkspace } from "@/domains/workspaces/onboarding/infra/create-workspace-client"
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

const createWorkspaceFormSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required."),
})

const CreateWorkspaceForm = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isNavigating, startTransition] = useTransition()
  const form = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        await createWorkspace({
          name: value.name.trim(),
        })
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Unable to create your workspace."
        )
        return
      }

      startTransition(() => {
        navigate({
          to: "/app",
        })
      })
    },
    validators: {
      onBlur: createWorkspaceFormSchema,
      onSubmit: createWorkspaceFormSchema,
    },
  })
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await form.handleSubmit()
    }
  )

  return (
    <form className="gap-6 flex flex-col" noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        <form.Field name="name">
          {(field) => (
            <FormTextField
              autoComplete="organization"
              description="We'll generate the workspace slug for you."
              field={field}
              label="Workspace name"
              placeholder="Operations Control"
              type="text"
            />
          )}
        </form.Field>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <FormActions>
          <Button disabled={isSubmitting || isNavigating} type="submit">
            {isSubmitting || isNavigating
              ? "Creating workspace..."
              : "Create workspace"}
          </Button>
          <FieldDescription className="text-center">
            Join by invite lands in TSK-27. For now, start by creating your own
            workspace.
          </FieldDescription>
        </FormActions>
      </FieldGroup>
    </form>
  )
}

export { CreateWorkspaceForm }
