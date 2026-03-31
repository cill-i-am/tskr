import type { SettingsAdminAccountProfile } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { updateAccountProfile } from "@/domains/identity/settings-admin/infra/update-account-profile"
import { useIsHydrated } from "@/domains/shared/ui/use-is-hydrated"
import { useForm, useStore } from "@tanstack/react-form"
import { useRouter } from "@tanstack/react-router"
import { useEffectEvent, useState } from "react"
import type { FormEvent } from "react"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import { FieldDescription, FieldGroup } from "@workspace/ui/components/field"
import {
  FormActions,
  FormMessage,
  FormTextField,
} from "@workspace/ui/components/form"

import { SettingsIdentityPreview } from "./settings-identity-preview"
import { toNullableTrimmedValue } from "./settings-profile-form-utils"

const accountProfileFormSchema = z.object({
  image: z.string(),
  name: z.string().trim().min(1, "Name is required."),
})

interface AccountProfileFormProps {
  accountProfile: SettingsAdminAccountProfile
}

const AccountProfileForm = ({ accountProfile }: AccountProfileFormProps) => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const isHydrated = useIsHydrated()
  const form = useForm({
    defaultValues: {
      image: accountProfile.image ?? "",
      name: accountProfile.name,
    },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        await updateAccountProfile({
          image: toNullableTrimmedValue(value.image),
          name: value.name.trim(),
        })
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Unable to save your account profile."
        )
        return
      }

      await router.invalidate()
    },
    validators: {
      onBlur: accountProfileFormSchema,
      onSubmit: accountProfileFormSchema,
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
            fallbackLabel="avatar"
            imageUrl={toNullableTrimmedValue(state.values.image)}
            supportingCopy={`Email context: ${accountProfile.email}.`}
          />
        )}
      </form.Subscribe>
      <FieldGroup>
        <form.Field name="name">
          {(field) => (
            <FormTextField
              autoComplete="name"
              disabled={isDisabled}
              field={field}
              label="Name"
              placeholder="Ada Lovelace"
              type="text"
            />
          )}
        </form.Field>
        <form.Field name="image">
          {(field) => (
            <FormTextField
              autoComplete="url"
              description="Leave blank to remove the avatar image."
              disabled={isDisabled}
              field={field}
              label="Avatar image URL"
              placeholder="https://cdn.example.com/avatar.png"
              type="url"
            />
          )}
        </form.Field>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <FormActions>
          <Button disabled={isDisabled} type="submit">
            {isSubmitting
              ? "Saving account profile..."
              : "Save account profile"}
          </Button>
          <FieldDescription className="text-center">
            Your account profile stays owned by the auth service.
          </FieldDescription>
        </FormActions>
      </FieldGroup>
    </form>
  )
}

export { AccountProfileForm }
