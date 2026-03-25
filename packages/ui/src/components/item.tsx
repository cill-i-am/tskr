import { Separator } from "@/components/separator"
import { cn } from "@/lib/utils"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"
import * as React from "react"
const ItemGroup = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    role="list"
    data-slot="item-group"
    className={cn(
      "group/item-group gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2 flex w-full flex-col",
      className
    )}
    {...props}
  />
)
const ItemSeparator = ({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) => (
  <Separator
    data-slot="item-separator"
    orientation="horizontal"
    className={cn("my-2", className)}
    {...props}
  />
)
const itemVariants = cva(
  "group/item text-sm flex w-full flex-wrap items-center rounded-lg border transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-muted",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "gap-2.5 px-3 py-2.5",
        sm: "gap-2.5 px-3 py-2.5",
        xs: "gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0",
      },
      variant: {
        default: "border-transparent",
        muted: "border-transparent bg-muted/50",
        outline: "border-border",
      },
    },
  }
)
const Item = ({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof itemVariants>) =>
  useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(itemVariants({ className, size, variant })),
      },
      props
    ),
    render,
    state: {
      size,
      slot: "item",
      variant,
    },
  })
const itemMediaVariants = cva(
  "gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 flex shrink-0 items-center justify-center group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "[&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover",
      },
    },
  }
)
const ItemMedia = ({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) => (
  <div
    data-slot="item-media"
    data-variant={variant}
    className={cn(itemMediaVariants({ className, variant }))}
    {...props}
  />
)
const ItemContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="item-content"
    className={cn(
      "gap-1 group-data-[size=xs]/item:gap-0 flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none",
      className
    )}
    {...props}
  />
)
const ItemTitle = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="item-title"
    className={cn(
      "gap-2 text-sm leading-snug font-medium line-clamp-1 flex w-fit items-center underline-offset-4",
      className
    )}
    {...props}
  />
)
const ItemDescription = ({
  className,
  ...props
}: React.ComponentProps<"p">) => (
  <p
    data-slot="item-description"
    className={cn(
      "text-sm leading-normal font-normal group-data-[size=xs]/item:text-xs line-clamp-2 text-left text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
      className
    )}
    {...props}
  />
)
const ItemActions = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="item-actions"
    className={cn("gap-2 flex items-center", className)}
    {...props}
  />
)
const ItemHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="item-header"
    className={cn(
      "gap-2 flex basis-full items-center justify-between",
      className
    )}
    {...props}
  />
)
const ItemFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="item-footer"
    className={cn(
      "gap-2 flex basis-full items-center justify-between",
      className
    )}
    {...props}
  />
)
export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}
