import { settingsAdminWorkspaceRoleSchema } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import type { SettingsAdminWorkspaceRole } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { createWorkspaceInvite } from "@/domains/identity/settings-admin/infra/create-workspace-invite"
import { getWorkspaceRoleLabel } from "@/domains/workspaces/shared/workspace-role-labels"
import type { AnyFieldApi } from "@tanstack/react-form"
import { useForm, useStore } from "@tanstack/react-form"
import { useEffect, useEffectEvent } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { FormActions, FormTextField } from "@workspace/ui/components/form"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"

interface InviteMemberFormProps {
  canInviteRoles: SettingsAdminWorkspaceRole[]
  onClearError: () => void
  onError: (message: string) => void
  onRefresh: () => Promise<void>
  workspaceId: string
}

const inviteMemberFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  role: settingsAdminWorkspaceRoleSchema,
})

interface InviteRoleFieldProps {
  canInviteRoles: SettingsAdminWorkspaceRole[]
  disabled: boolean
  field: AnyFieldApi
}

const InviteRoleField = ({
  canInviteRoles,
  disabled,
  field,
}: InviteRoleFieldProps) => {
  const isInvalid =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const handleRoleChange = useEffectEvent(
    (event: ChangeEvent<HTMLSelectElement>) => {
      field.handleChange(event.target.value as SettingsAdminWorkspaceRole)
    }
  )

  return (
    <Field data-invalid={isInvalid || undefined}>
      <FieldLabel htmlFor={field.name}>Invite role</FieldLabel>
      <FieldContent>
        <NativeSelect
          aria-invalid={isInvalid || undefined}
          disabled={disabled}
          id={field.name}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={handleRoleChange}
          value={field.state.value}
        >
          {canInviteRoles.map((role) => (
            <NativeSelectOption key={role} value={role}>
              {getWorkspaceRoleLabel(role)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>
          Available roles come directly from the workspace permissions snapshot.
        </FieldDescription>
      </FieldContent>
    </Field>
  )
}

const InviteMemberForm = ({
  canInviteRoles,
  onClearError,
  onError,
  onRefresh,
  workspaceId,
}: InviteMemberFormProps) => {
  const [defaultRole = "dispatcher"] = canInviteRoles
  const form = useForm({
    defaultValues: {
      email: "",
      role: defaultRole,
    },
    onSubmit: async ({ formApi, value }) => {
      if (!canInviteRoles.includes(value.role as SettingsAdminWorkspaceRole)) {
        onError("Select one of the allowed invite roles.")
        return
      }

      onClearError()

      try {
        await createWorkspaceInvite({
          email: value.email.trim(),
          role: value.role as SettingsAdminWorkspaceRole,
          workspaceId,
        })
        formApi.reset({
          email: "",
          role: defaultRole,
        })
        await onRefresh()
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Unable to send the workspace invite."
        )
      }
    },
    validators: {
      onBlur: inviteMemberFormSchema,
      onSubmit: inviteMemberFormSchema,
    },
  })
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)

  useEffect(() => {
    if (canInviteRoles.length === 0) {
      return
    }

    const currentRole = form.getFieldValue("role")

    if (canInviteRoles.includes(currentRole as SettingsAdminWorkspaceRole)) {
      return
    }

    form.setFieldValue("role", defaultRole)
  }, [canInviteRoles, defaultRole, form])

  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await form.handleSubmit()
    }
  )
  const isDisabled = isSubmitting

  if (canInviteRoles.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Invites are managed elsewhere for your current workspace role.
      </div>
    )
  }

  return (
    <form
      aria-label="Invite member"
      className="gap-5 flex flex-col"
      noValidate
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <form.Field name="email">
          {(field) => (
            <FormTextField
              autoComplete="email"
              disabled={isDisabled}
              field={field}
              label="Invite email"
              placeholder="teammate@example.com"
              type="email"
            />
          )}
        </form.Field>
        <form.Field name="role">
          {(field) => (
            <InviteRoleField
              canInviteRoles={canInviteRoles}
              disabled={isDisabled}
              field={field}
            />
          )}
        </form.Field>
        <FormActions>
          <Button disabled={isDisabled} type="submit">
            {isSubmitting ? "Sending invite..." : "Send invite"}
          </Button>
        </FormActions>
      </FieldGroup>
    </form>
  )
}

export { InviteMemberForm }
