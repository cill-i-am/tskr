"use client"
import { Button } from "@/components/button"
import { cn } from "@/lib/utils"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import * as React from "react"
const Sheet = ({ ...props }: SheetPrimitive.Root.Props) => (
  <SheetPrimitive.Root data-slot="sheet" {...props} />
)
const SheetTrigger = ({ ...props }: SheetPrimitive.Trigger.Props) => (
  <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
)
const SheetClose = ({ ...props }: SheetPrimitive.Close.Props) => (
  <SheetPrimitive.Close data-slot="sheet-close" {...props} />
)
const SheetPortal = ({ ...props }: SheetPrimitive.Portal.Props) => (
  <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
)
const SheetOverlay = ({
  className,
  ...props
}: SheetPrimitive.Backdrop.Props) => (
  <SheetPrimitive.Backdrop
    data-slot="sheet-overlay"
    className={cn(
      "inset-0 bg-black/10 supports-backdrop-filter:backdrop-blur-xs fixed z-50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
      className
    )}
    {...props}
  />
)
const SheetContent = ({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Popup
      data-slot="sheet-content"
      data-side={side}
      className={cn(
        "gap-4 text-sm shadow-lg ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm fixed z-50 flex flex-col bg-popover bg-clip-padding text-popover-foreground transition duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem]",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <SheetPrimitive.Close
          data-slot="sheet-close"
          render={
            <Button
              variant="ghost"
              className="top-3 right-3 absolute"
              size="icon-sm"
            />
          }
        >
          <XIcon />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Popup>
  </SheetPortal>
)
const SheetHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="sheet-header"
    className={cn("gap-0.5 p-4 flex flex-col", className)}
    {...props}
  />
)
const SheetFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="sheet-footer"
    className={cn("gap-2 p-4 mt-auto flex flex-col", className)}
    {...props}
  />
)
const SheetTitle = ({ className, ...props }: SheetPrimitive.Title.Props) => (
  <SheetPrimitive.Title
    data-slot="sheet-title"
    className={cn("text-base font-medium text-foreground", className)}
    {...props}
  />
)
const SheetDescription = ({
  className,
  ...props
}: SheetPrimitive.Description.Props) => (
  <SheetPrimitive.Description
    data-slot="sheet-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
)
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
