import { Label } from "@/components/label"
import { Separator } from "@/components/separator"
import { cn } from "@/lib/utils"
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import * as React from "react"

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3 flex flex-col",
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
        className
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4 @container/field-group flex w-full flex-col",
        className
      )}
      {...props}
    />
  )
}

const fieldVariants = cva(
  "group/field gap-2 flex w-full data-[invalid=true]:text-destructive",
  {
    defaultVariants: {
      orientation: "vertical",
    },
    variants: {
      orientation: {
        horizontal:
          "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        responsive:
          "@md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px flex-col *:w-full [&>.sr-only]:w-auto",
        vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
      },
    },
  }
)

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      data-orientation={orientation}
      data-slot="field"
      role="group"
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content gap-0.5 leading-snug flex flex-1 flex-col",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label gap-2 leading-snug *:data-[slot=field]:p-2.5 flex w-fit group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border",
        className
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "gap-2 text-sm leading-snug font-medium flex w-fit items-center group-data-[disabled=true]/field:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-sm leading-normal font-normal [[data-variant=legend]+&]:-mt-1.5 last:mt-0 nth-last-2:-mt-1 text-left text-muted-foreground group-has-data-horizontal/field:text-balance [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-content={Boolean(children)}
      data-slot="field-separator"
      className={cn(
        "-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2 relative",
        className
      )}
      {...props}
    >
      <Separator className="inset-0 absolute top-1/2" />
      {children ? (
        <span
          className="px-2 relative mx-auto block w-fit bg-background text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      ) : null}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: ({ message?: string } | undefined)[]
}) {
  if (children) {
    return (
      <div
        data-slot="field-error"
        role="alert"
        className={cn("text-sm font-normal text-destructive", className)}
        {...props}
      >
        {children}
      </div>
    )
  }

  const uniqueMessages: string[] = []

  for (const error of errors ?? []) {
    const message = error?.message

    if (message && !uniqueMessages.includes(message)) {
      uniqueMessages.push(message)
    }
  }

  if (!uniqueMessages.length) {
    return null
  }

  return (
    <div
      data-slot="field-error"
      role="alert"
      className={cn("text-sm font-normal text-destructive", className)}
      {...props}
    >
      {uniqueMessages.length === 1 ? (
        uniqueMessages[0]
      ) : (
        <ul className="ml-4 gap-1 flex list-disc flex-col">
          {uniqueMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
