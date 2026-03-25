"use client"
import { Separator } from "@/components/separator"
import { cn } from "@/lib/utils"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"
const buttonGroupVariants = cva(
  "has-[>[data-slot=button-group]]:gap-2 flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-lg [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    defaultVariants: {
      orientation: "horizontal",
    },
    variants: {
      orientation: {
        horizontal:
          "*:data-slot:rounded-r-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-lg! [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0",
        vertical:
          "flex-col *:data-slot:rounded-b-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-lg! [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0",
      },
    },
  }
)
const ButtonGroup = ({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) => (
  <div
    role="group"
    data-slot="button-group"
    data-orientation={orientation}
    className={cn(buttonGroupVariants({ orientation }), className)}
    {...props}
  />
)
const ButtonGroupText = ({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) =>
  useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "gap-2 px-2.5 text-sm font-medium [&_svg:not([class*='size-'])]:size-4 flex items-center rounded-lg border bg-muted [&_svg]:pointer-events-none",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "button-group-text",
    },
  })
const ButtonGroupSeparator = ({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) => (
  <Separator
    data-slot="button-group-separator"
    orientation={orientation}
    className={cn(
      "relative self-stretch bg-input data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto",
      className
    )}
    {...props}
  />
)
export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}
