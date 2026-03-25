import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu"
import { cn } from "@/lib/utils"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar"
import { CheckIcon } from "lucide-react"
import * as React from "react"
const Menubar = ({ className, ...props }: MenubarPrimitive.Props) => (
  <MenubarPrimitive
    data-slot="menubar"
    className={cn(
      "h-8 gap-0.5 flex items-center rounded-lg border p-[3px]",
      className
    )}
    {...props}
  />
)
const MenubarMenu = ({
  ...props
}: React.ComponentProps<typeof DropdownMenu>) => (
  <DropdownMenu data-slot="menubar-menu" {...props} />
)
const MenubarGroup = ({
  ...props
}: React.ComponentProps<typeof DropdownMenuGroup>) => (
  <DropdownMenuGroup data-slot="menubar-group" {...props} />
)
const MenubarPortal = ({
  ...props
}: React.ComponentProps<typeof DropdownMenuPortal>) => (
  <DropdownMenuPortal data-slot="menubar-portal" {...props} />
)
const MenubarTrigger = ({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger>) => (
  <DropdownMenuTrigger
    data-slot="menubar-trigger"
    className={cn(
      "px-1.5 text-sm font-medium flex items-center rounded-sm py-[2px] outline-hidden select-none hover:bg-muted aria-expanded:bg-muted",
      className
    )}
    {...props}
  />
)
const MenubarContent = ({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) => (
  <DropdownMenuContent
    data-slot="menubar-content"
    align={align}
    alignOffset={alignOffset}
    sideOffset={sideOffset}
    className={cn(
      "dark min-w-36 p-1 shadow-md before:inset-0 before:backdrop-blur-2xl relative animate-none! rounded-lg bg-popover/70 text-popover-foreground ring-1 ring-foreground/10 duration-100 before:pointer-events-none before:absolute before:-z-1 before:rounded-[inherit] before:backdrop-saturate-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:**:text-accent-foreground! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:focus:bg-foreground/10!",
      className
    )}
    {...props}
  />
)
const MenubarItem = ({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuItem>) => (
  <DropdownMenuItem
    data-slot="menubar-item"
    data-inset={inset}
    data-variant={variant}
    className={cn(
      "group/menubar-item gap-1.5 px-1.5 py-1 text-sm data-inset:pl-7 [&_svg:not([class*='size-'])]:size-4 rounded-md focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:opacity-50 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:*:[svg]:text-destructive!",
      className
    )}
    {...props}
  />
)
const MenubarCheckboxItem = ({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) => (
  <MenuPrimitive.CheckboxItem
    data-slot="menubar-checkbox-item"
    data-inset={inset}
    className={cn(
      "gap-1.5 py-1 pr-1.5 pl-7 text-sm data-inset:pl-7 relative flex cursor-default items-center rounded-md outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="left-1.5 size-4 [&_svg:not([class*='size-'])]:size-4 pointer-events-none absolute flex items-center justify-center">
      <MenuPrimitive.CheckboxItemIndicator>
        <CheckIcon />
      </MenuPrimitive.CheckboxItemIndicator>
    </span>
    {children}
  </MenuPrimitive.CheckboxItem>
)
const MenubarRadioGroup = ({
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroup>) => (
  <DropdownMenuRadioGroup data-slot="menubar-radio-group" {...props} />
)
const MenubarRadioItem = ({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) => (
  <MenuPrimitive.RadioItem
    data-slot="menubar-radio-item"
    data-inset={inset}
    className={cn(
      "gap-1.5 py-1 pr-1.5 pl-7 text-sm data-inset:pl-7 [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center rounded-md outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      className
    )}
    {...props}
  >
    <span className="left-1.5 size-4 [&_svg:not([class*='size-'])]:size-4 pointer-events-none absolute flex items-center justify-center">
      <MenuPrimitive.RadioItemIndicator>
        <CheckIcon />
      </MenuPrimitive.RadioItemIndicator>
    </span>
    {children}
  </MenuPrimitive.RadioItem>
)
const MenubarLabel = ({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabel> & {
  inset?: boolean
}) => (
  <DropdownMenuLabel
    data-slot="menubar-label"
    data-inset={inset}
    className={cn("px-1.5 py-1 text-sm font-medium data-inset:pl-7", className)}
    {...props}
  />
)
const MenubarSeparator = ({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) => (
  <DropdownMenuSeparator
    data-slot="menubar-separator"
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
)
const MenubarShortcut = ({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuShortcut>) => (
  <DropdownMenuShortcut
    data-slot="menubar-shortcut"
    className={cn(
      "text-xs tracking-widest ml-auto text-muted-foreground group-focus/menubar-item:text-accent-foreground",
      className
    )}
    {...props}
  />
)
const MenubarSub = ({
  ...props
}: React.ComponentProps<typeof DropdownMenuSub>) => (
  <DropdownMenuSub data-slot="menubar-sub" {...props} />
)
const MenubarSubTrigger = ({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubTrigger> & {
  inset?: boolean
}) => (
  <DropdownMenuSubTrigger
    data-slot="menubar-sub-trigger"
    data-inset={inset}
    className={cn(
      "gap-1.5 px-1.5 py-1 text-sm data-inset:pl-7 [&_svg:not([class*='size-'])]:size-4 rounded-md focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground",
      className
    )}
    {...props}
  />
)
const MenubarSubContent = ({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubContent>) => (
  <DropdownMenuSubContent
    data-slot="menubar-sub-content"
    className={cn(
      "dark min-w-32 p-1 shadow-lg before:inset-0 before:backdrop-blur-2xl relative animate-none! rounded-lg bg-popover/70 text-popover-foreground ring-1 ring-foreground/10 duration-100 before:pointer-events-none before:absolute before:-z-1 before:rounded-[inherit] before:backdrop-saturate-150 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:**:text-accent-foreground! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:focus:bg-foreground/10!",
      className
    )}
    {...props}
  />
)
export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
}
