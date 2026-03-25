"use client"
import { cn } from "@/lib/utils"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import * as React from "react"
const Slider = ({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) => {
  const _values = React.useMemo(() => {
    if (Array.isArray(value)) {
      return value
    }
    if (Array.isArray(defaultValue)) {
      return defaultValue
    }
    return [min, max]
  }, [value, defaultValue, min, max])
  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="data-horizontal:h-1 data-vertical:w-1 relative grow overflow-hidden rounded-full bg-muted select-none data-horizontal:w-full data-vertical:h-full"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="size-3 bg-white after:-inset-2 relative block shrink-0 rounded-full border border-ring ring-ring/50 transition-[color,box-shadow] select-none after:absolute hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}
export { Slider }
