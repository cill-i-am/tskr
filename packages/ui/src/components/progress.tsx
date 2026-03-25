"use client"
import { cn } from "@/lib/utils"
import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

const ProgressTrack = ({
  className,
  ...props
}: ProgressPrimitive.Track.Props) => (
  <ProgressPrimitive.Track
    className={cn(
      "h-1 relative flex w-full items-center overflow-x-hidden rounded-full bg-muted",
      className
    )}
    data-slot="progress-track"
    {...props}
  />
)

const ProgressIndicator = ({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) => (
  <ProgressPrimitive.Indicator
    data-slot="progress-indicator"
    className={cn("h-full bg-primary transition-all", className)}
    {...props}
  />
)

const Progress = ({
  className,
  children,
  value,
  ...props
}: ProgressPrimitive.Root.Props) => (
  <ProgressPrimitive.Root
    value={value}
    data-slot="progress"
    className={cn("gap-3 flex flex-wrap", className)}
    {...props}
  >
    {children}
    <ProgressTrack>
      <ProgressIndicator />
    </ProgressTrack>
  </ProgressPrimitive.Root>
)

const ProgressLabel = ({
  className,
  ...props
}: ProgressPrimitive.Label.Props) => (
  <ProgressPrimitive.Label
    className={cn("text-sm font-medium", className)}
    data-slot="progress-label"
    {...props}
  />
)

const ProgressValue = ({
  className,
  ...props
}: ProgressPrimitive.Value.Props) => (
  <ProgressPrimitive.Value
    className={cn(
      "text-sm ml-auto text-muted-foreground tabular-nums",
      className
    )}
    data-slot="progress-value"
    {...props}
  />
)
export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
