/* eslint-disable jsx-a11y/label-has-associated-control */
import { cn } from "@/lib/utils"
import * as React from "react"
const Label = ({ className, ...props }: React.ComponentProps<"label">) => (
  <label
    data-slot="label"
    className={cn(
      "gap-2 text-sm font-medium flex items-center leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className
    )}
    {...props}
  />
)
export { Label }
