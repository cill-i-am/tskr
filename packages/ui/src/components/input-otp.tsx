import { cn } from "@/lib/utils"
import { OTPInput, OTPInputContext } from "input-otp"
import * as React from "react"

const InputOTP = ({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) => {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        containerClassName
      )}
      spellCheck={false}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

const InputOTPGroup = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        "flex items-center rounded-lg has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

const InputOTPSlot = ({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
}) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "size-10 text-sm relative flex items-center justify-center border-y border-r border-input bg-background transition-all outline-none first:rounded-l-lg first:border-l last:rounded-r-lg aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="inset-0 pointer-events-none absolute flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
}

const InputOTPSeparator = ({ ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="input-otp-separator"
      className="px-2 flex items-center"
      role="separator"
      {...props}
    >
      <div className="w-3 h-px bg-border" />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
