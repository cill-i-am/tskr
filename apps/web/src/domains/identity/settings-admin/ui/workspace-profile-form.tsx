import type { SettingsAdminWorkspaceProfile } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { updateWorkspaceProfile } from "@/domains/identity/settings-admin/infra/update-workspace-profile"
import { useIsHydrated } from "@/domains/shared/ui/use-is-hydrated"
import { useForm, useStore } from "@tanstack/react-form"
import { useRouter } from "@tanstack/react-router"
import { useEffectEvent, useState } from "react"
import type { FormEvent } from "react"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  FormActions,
  FormMessage,
  FormTextField,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"

import { SettingsIdentityPreview } from "./settings-identity-preview"
import { toNullableTrimmedValue } from "./settings-profile-form-utils"

const workspaceProfileFormSchema = z.object({
  logo: z.string(),
  name: z.string().trim().min(1, "Workspace name is required."),
})

interface WorkspaceProfileFormProps {
  workspaceProfile: SettingsAdminWorkspaceProfile
}

const WorkspaceProfileForm = ({
  workspaceProfile,
}: WorkspaceProfileFormProps) => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const isHydrated = useIsHydrated()
  const form = useForm({
    defaultValues: {
      logo: workspaceProfile.logo ?? "",
      name: workspaceProfile.name,
    },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        await updateWorkspaceProfile({
          logo: toNullableTrimmedValue(value.logo),
          name: value.name.trim(),
          workspaceId: workspaceProfile.id,
        })
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Unable to save your workspace profile."
        )
        return
      }

      await router.invalidate()
    },
    validators: {
      onBlur: workspaceProfileFormSchema,
      onSubmit: workspaceProfileFormSchema,
    },
  })
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await form.handleSubmit()
    }
  )

  const isDisabled = !isHydrated || isSubmitting

  return (
    <form
      className="gap-6 flex flex-col"
      method="post"
      noValidate
      onSubmit={handleSubmit}
    >
      <form.Subscribe>
        {(state) => (
          <SettingsIdentityPreview
            displayName={state.values.name}
            fallbackLabel="logo"
            imageUrl={toNullableTrimmedValue(state.values.logo)}
            supportingCopy={`Workspace context: ${workspaceProfile.slug}.`}
          />
        )}
      </form.Subscribe>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="workspace-slug">Workspace slug</FieldLabel>
          <FieldContent>
            <Input
              aria-readonly="true"
              id="workspace-slug"
              readOnly
              value={workspaceProfile.slug}
            />
            <FieldDescription>
              Read only workspace context. Used in invites and workspace links.
            </FieldDescription>
          </FieldContent>
        </Field>
        <form.Field name="name">
          {(field) => (
            <FormTextField
              autoComplete="organization"
              disabled={isDisabled}
              field={field}
              label="Workspace name"
              placeholder="Operations Control"
              type="text"
            />
          )}
        </form.Field>
        <form.Field name="logo">
          {(field) => (
            <FormTextField
              autoComplete="url"
              description="Leave blank to remove the workspace logo."
              disabled={isDisabled}
              field={field}
              label="Logo URL"
              placeholder="https://cdn.example.com/logo.png"
              type="url"
            />
          )}
        </form.Field>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <FormActions>
          <Button disabled={isDisabled} type="submit">
            {isSubmitting
              ? "Saving workspace profile..."
              : "Save workspace profile"}
          </Button>
          <FieldDescription className="text-center">
            Workspace profile changes are sourced from the auth-owned snapshot.
          </FieldDescription>
        </FormActions>
      </FieldGroup>
    </form>
  )
}

export { WorkspaceProfileForm }
