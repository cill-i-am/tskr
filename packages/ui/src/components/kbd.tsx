import { cn } from "@/lib/utils"
const Kbd = ({ className, ...props }: React.ComponentProps<"kbd">) => (
  <kbd
    data-slot="kbd"
    className={cn(
      "h-5 min-w-5 gap-1 px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 pointer-events-none inline-flex w-fit items-center justify-center rounded-sm bg-muted text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10",
      className
    )}
    {...props}
  />
)
const KbdGroup = ({ className, ...props }: React.ComponentProps<"div">) => (
  <kbd
    data-slot="kbd-group"
    className={cn("gap-1 inline-flex items-center", className)}
    {...props}
  />
)
export { Kbd, KbdGroup }
