import type { SettingsAdminWorkspaceRole } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { createWorkspaceInvite } from "@/domains/identity/settings-admin/infra/create-workspace-invite"
import { useForm, useStore } from "@tanstack/react-form"
import { useEffectEvent } from "react"
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

const roleLabels: Record<SettingsAdminWorkspaceRole, string> = {
  admin: "Admin",
  dispatcher: "Dispatcher",
  field_worker: "Field worker",
  owner: "Owner",
}

const inviteMemberFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  role: z.string().min(1, "Select a role."),
})

interface InviteRoleFieldProps {
  canInviteRoles: SettingsAdminWorkspaceRole[]
  field: {
    handleBlur: () => void
    handleChange: (value: string) => void
    name: string
    state: {
      meta: {
        errors: {
          message?: string
        }[]
        isTouched: boolean
      }
      value: string
    }
  }
}

const InviteRoleField = ({ canInviteRoles, field }: InviteRoleFieldProps) => {
  const handleRoleChange = useEffectEvent(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      field.handleChange(event.target.value)
    }
  )

  return (
    <Field
      data-invalid={
        field.state.meta.isTouched && field.state.meta.errors.length > 0
          ? true
          : undefined
      }
    >
      <FieldLabel htmlFor={field.name}>Invite role</FieldLabel>
      <FieldContent>
        <NativeSelect
          aria-invalid={
            field.state.meta.isTouched && field.state.meta.errors.length > 0
              ? true
              : undefined
          }
          id={field.name}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={handleRoleChange}
          value={field.state.value}
        >
          {canInviteRoles.map((role) => (
            <NativeSelectOption key={role} value={role}>
              {roleLabels[role]}
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
  const defaultRole = canInviteRoles[0] ?? ""
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
  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await form.handleSubmit()
    }
  )

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
              field={field}
              label="Invite email"
              placeholder="teammate@example.com"
              type="email"
            />
          )}
        </form.Field>
        <form.Field name="role">
          {(field) => (
            <InviteRoleField canInviteRoles={canInviteRoles} field={field} />
          )}
        </form.Field>
        <FormActions>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Sending invite..." : "Send invite"}
          </Button>
        </FormActions>
      </FieldGroup>
    </form>
  )
}

export { InviteMemberForm }
