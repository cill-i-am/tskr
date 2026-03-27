"use client"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldContent,
  FieldLabel,
} from "@/components/field"
import { Input } from "@/components/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/input-otp"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/select"
import { Textarea } from "@/components/textarea"
import { cn } from "@/lib/utils"
import type { SelectRoot } from "@base-ui/react/select"
import { useEffectEvent } from "react"
import * as React from "react"

type FormErrorLike =
  | {
      message?: string
    }
  | undefined

interface FormFieldLike<Value> {
  handleBlur: () => void
  handleChange: (value: Value) => void
  name: string
  state: {
    meta: {
      errors: FormErrorLike[]
      isTouched: boolean
    }
    value: Value
  }
}

type FormMessageProps = React.ComponentProps<typeof FieldError>

interface FormFieldShellProps extends React.ComponentProps<typeof Field> {
  children: React.ReactNode
  description?: React.ReactNode
  errors?: FormErrorLike[]
  htmlFor: string
  invalid?: boolean
  label: React.ReactNode
}

interface FormTextFieldProps extends Omit<
  React.ComponentProps<typeof Input>,
  "aria-invalid" | "id" | "name" | "onBlur" | "onChange" | "value"
> {
  description?: React.ReactNode
  field: FormFieldLike<string>
  invalid?: boolean
  label: React.ReactNode
}

interface FormTextareaFieldProps extends Omit<
  React.ComponentProps<typeof Textarea>,
  "aria-invalid" | "id" | "name" | "onBlur" | "onChange" | "value"
> {
  description?: React.ReactNode
  field: FormFieldLike<string>
  invalid?: boolean
  label: React.ReactNode
}

interface FormSelectFieldProps extends Omit<
  React.ComponentProps<typeof SelectTrigger>,
  "aria-invalid" | "children" | "id" | "onBlur" | "onChange"
> {
  children: React.ReactNode
  description?: React.ReactNode
  field: FormFieldLike<string>
  invalid?: boolean
  label: React.ReactNode
  placeholder?: React.ReactNode
  selectProps?: Omit<
    SelectRoot.Props<string>,
    "children" | "defaultValue" | "multiple" | "onValueChange" | "value"
  >
}

interface FormOtpFieldProps extends Omit<
  React.ComponentProps<typeof InputOTP>,
  | "aria-invalid"
  | "children"
  | "id"
  | "maxLength"
  | "name"
  | "onBlur"
  | "onChange"
  | "render"
  | "value"
> {
  description?: React.ReactNode
  field: FormFieldLike<string>
  onChangeEffect?: (field: FormFieldLike<string>, value: string) => void
  invalid?: boolean
  label: React.ReactNode
  length?: number
}

type FormActionsProps = React.ComponentProps<"div">

const FormMessage = ({ className, ...props }: FormMessageProps) => (
  <FieldError
    className={cn("text-sm font-normal text-destructive", className)}
    {...props}
  />
)

const FormFieldShell = ({
  children,
  className,
  description,
  errors,
  htmlFor,
  invalid,
  label,
  ...props
}: FormFieldShellProps) => {
  const isInvalid = Boolean(invalid || errors?.length)

  return (
    <Field
      data-invalid={isInvalid || undefined}
      className={className}
      {...props}
    >
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <FieldContent>
        {children}
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
        <FormMessage errors={errors} />
      </FieldContent>
    </Field>
  )
}

const FormTextField = ({
  description,
  field,
  invalid,
  label,
  ...props
}: FormTextFieldProps) => {
  const isInvalid = Boolean(
    invalid ||
    (field.state.meta.isTouched && field.state.meta.errors.length > 0)
  )
  const errors = isInvalid ? field.state.meta.errors : undefined
  const handleChange = useEffectEvent(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      field.handleChange(event.target.value)
    }
  )

  return (
    <FormFieldShell
      description={description}
      errors={errors}
      htmlFor={field.name}
      invalid={invalid}
      label={label}
    >
      <Input
        aria-invalid={isInvalid || undefined}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={handleChange}
        value={field.state.value}
        {...props}
      />
    </FormFieldShell>
  )
}

const FormTextareaField = ({
  description,
  field,
  invalid,
  label,
  ...props
}: FormTextareaFieldProps) => {
  const isInvalid = Boolean(
    invalid ||
    (field.state.meta.isTouched && field.state.meta.errors.length > 0)
  )
  const errors = isInvalid ? field.state.meta.errors : undefined
  const handleChange = useEffectEvent(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      field.handleChange(event.target.value)
    }
  )

  return (
    <FormFieldShell
      description={description}
      errors={errors}
      htmlFor={field.name}
      invalid={invalid}
      label={label}
    >
      <Textarea
        aria-invalid={isInvalid || undefined}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={handleChange}
        value={field.state.value}
        {...props}
      />
    </FormFieldShell>
  )
}

const FormSelectField = ({
  children,
  description,
  field,
  invalid,
  label,
  placeholder,
  selectProps,
  ...props
}: FormSelectFieldProps) => {
  const isInvalid = Boolean(
    invalid ||
    (field.state.meta.isTouched && field.state.meta.errors.length > 0)
  )
  const errors = isInvalid ? field.state.meta.errors : undefined
  const controlId = selectProps?.id ?? field.name
  const handleValueChange = useEffectEvent((value: string | null) => {
    if (value === null) {
      throw new Error("FormSelectField only supports string values")
    }
    field.handleChange(value)
  })

  return (
    <FormFieldShell
      description={description}
      errors={errors}
      htmlFor={controlId}
      invalid={invalid}
      label={label}
    >
      <Select
        {...selectProps}
        id={controlId}
        name={selectProps?.name ?? field.name}
        value={field.state.value}
        onValueChange={handleValueChange}
      >
        <SelectTrigger
          aria-invalid={isInvalid || undefined}
          id={controlId}
          onBlur={field.handleBlur}
          {...props}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </FormFieldShell>
  )
}

const FormOtpField = ({
  description,
  field,
  invalid,
  onChangeEffect,
  label,
  length = 6,
  containerClassName,
  ...props
}: FormOtpFieldProps) => {
  const isInvalid = Boolean(
    invalid ||
    (field.state.meta.isTouched && field.state.meta.errors.length > 0)
  )
  const errors = isInvalid ? field.state.meta.errors : undefined
  const handleChange = useEffectEvent((value: string) => {
    if (onChangeEffect) {
      onChangeEffect(field, value)
    }
    field.handleChange(value)
  })
  const slots = (
    <InputOTPGroup>
      {Array.from({ length }, (_, index) => (
        <InputOTPSlot key={index} index={index} />
      ))}
    </InputOTPGroup>
  )

  return (
    <FormFieldShell
      description={description}
      errors={errors}
      htmlFor={field.name}
      invalid={invalid}
      label={label}
    >
      <InputOTP
        aria-invalid={isInvalid || undefined}
        containerClassName={cn("justify-center", containerClassName)}
        id={field.name}
        maxLength={length}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={handleChange}
        value={field.state.value}
        {...props}
      >
        {slots}
      </InputOTP>
    </FormFieldShell>
  )
}

const FormActions = ({ className, ...props }: FormActionsProps) => (
  <div className={cn("gap-3 flex flex-col", className)} {...props} />
)

export {
  FormActions,
  FormFieldShell,
  FormMessage,
  FormOtpField,
  FormSelectField,
  FormTextField,
  FormTextareaField,
}
