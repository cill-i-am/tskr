"use client"
import { cn } from "@/lib/utils"
import * as React from "react"
import * as RechartsPrimitive from "recharts"
import type { TooltipValueType } from "recharts"
// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { dark: ".dark", light: "" } as const
const INITIAL_DIMENSION = { height: 200, width: 320 } as const
type TooltipNameType = number | string
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | {
        color?: string
        theme?: never
      }
    | {
        color?: never
        theme: Record<keyof typeof THEMES, string>
      }
  )
>
interface ChartContextProps {
  config: ChartConfig
}
const ChartContext = React.createContext<ChartContextProps | null>(null)
const useChart = () => {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

const getPayloadConfigFromPayload = (
  config: ChartConfig,
  payload: unknown,
  key: string
) => {
  if (typeof payload !== "object" || payload === null) {
    return
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config ? config[configLabelKey] : config[key]
}

const ChartStyle = ({
  id,
  chartConfig,
}: {
  id: string
  chartConfig: ChartConfig
}) => {
  const colorConfig = Object.entries(chartConfig).filter(
    ([, entryConfig]) => entryConfig.theme ?? entryConfig.color
  )

  if (!colorConfig.length) {
    return null
  }

  const cssText = Object.entries(THEMES)
    .map(
      ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, entryConfig]) => {
    const color =
      entryConfig.theme?.[theme as keyof typeof entryConfig.theme] ??
      entryConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
    )
    .join("\n")

  return <style>{cssText}</style>
}

const ChartContainer = ({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"]
  initialDimension?: {
    width: number
    height: number
  }
}) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replaceAll(":", "")}`
  const chartContextValue = React.useMemo(() => ({ config }), [config])
  return (
    <ChartContext.Provider value={chartContextValue}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "aspect-video text-xs flex justify-center [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} chartConfig={config} />
        <RechartsPrimitive.ResponsiveContainer
          initialDimension={initialDimension}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}
const ChartTooltip = RechartsPrimitive.Tooltip

type ChartTooltipItem = NonNullable<
  RechartsPrimitive.DefaultTooltipContentProps<
    TooltipValueType,
    TooltipNameType
  >["payload"]
>[number] & {
  payload?: {
    fill?: string
  }
}

const ChartTooltipIndicator = ({
  indicator,
  hideIndicator,
  indicatorColor,
  itemConfig,
  nestLabel,
}: {
  indicator: "line" | "dot" | "dashed"
  hideIndicator: boolean
  indicatorColor: string | undefined
  itemConfig: ChartConfig[string] | undefined
  nestLabel: boolean
}) => {
  if (itemConfig?.icon) {
    return <itemConfig.icon />
  }

  if (hideIndicator) {
    return null
  }

  return (
    <div
      className={cn(
        "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
        {
          "h-2.5 w-2.5": indicator === "dot",
          "my-0.5": nestLabel && indicator === "dashed",
          "w-0 border-[1.5px] border-dashed bg-transparent":
            indicator === "dashed",
          "w-1": indicator === "line",
        }
      )}
      style={
        {
          "--color-bg": indicatorColor,
          "--color-border": indicatorColor,
        } as React.CSSProperties
      }
    />
  )
}

const ChartTooltipValue = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) {
    return null
  }

  return (
    <span className="font-mono font-medium text-foreground tabular-nums">
      {typeof value === "number" ? value.toLocaleString() : String(value)}
    </span>
  )
}

const ChartTooltipContentItem = ({
  item,
  index,
  indicator,
  nestLabel,
  tooltipLabel,
  formatter,
  color,
  hideIndicator,
  config,
  nameKey,
}: {
  item: ChartTooltipItem
  index: number
  indicator: "line" | "dot" | "dashed"
  nestLabel: boolean
  tooltipLabel: React.ReactNode
  formatter?: React.ComponentProps<
    typeof RechartsPrimitive.Tooltip
  >["formatter"]
  color?: string
  hideIndicator: boolean
  config: ChartConfig
  nameKey?: string
}) => {
  const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`
  const itemConfig = getPayloadConfigFromPayload(config, item, key)
  const indicatorColor = color ?? item.payload?.fill ?? item.color
  const formattedValue =
    formatter && item?.value !== undefined && item.name
      ? formatter(item.value, item.name, item, index, item.payload)
      : null

  const nestedLabel = nestLabel ? tooltipLabel : null

  if (formattedValue) {
    return formattedValue
  }

  return (
    <div
      className={cn(
        "gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 flex w-full flex-wrap items-stretch [&>svg]:text-muted-foreground",
        indicator === "dot" && "items-center"
      )}
    >
      <ChartTooltipIndicator
        indicator={indicator}
        hideIndicator={hideIndicator}
        indicatorColor={indicatorColor}
        itemConfig={itemConfig}
        nestLabel={nestLabel}
      />
      <div
        className={cn(
          "flex flex-1 justify-between leading-none",
          nestLabel ? "items-end" : "items-center"
        )}
      >
        <div className="gap-1.5 grid">
          {nestedLabel}
          <span className="text-muted-foreground">
            {itemConfig?.label ?? item.name}
          </span>
        </div>
        <ChartTooltipValue value={item.value} />
      </div>
    </div>
  )
}

const ChartTooltipContent = ({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<
      TooltipValueType,
      TooltipNameType
    >,
    "accessibilityLayer"
  >) => {
  const { config } = useChart()
  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }
    const [item] = payload
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : itemConfig?.label
    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      )
    }
    if (!value) {
      return null
    }
    return <div className={cn("font-medium", labelClassName)}>{value}</div>
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ])
  if (!active || !payload?.length) {
    return null
  }
  const nestLabel = payload.length === 1 && indicator !== "dot"
  return (
    <div
      className={cn(
        "min-w-32 gap-1.5 px-2.5 py-1.5 text-xs shadow-xl grid items-start rounded-lg border border-border/50 bg-background",
        className
      )}
    >
      {nestLabel ? null : tooltipLabel}
      <div className="gap-1.5 grid">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => (
            <ChartTooltipContentItem
              key={`${item.name ?? item.dataKey ?? item.color ?? "item"}-${item.dataKey ?? item.name ?? "value"}`}
              item={item}
              index={index}
              indicator={indicator}
              nestLabel={nestLabel}
              tooltipLabel={tooltipLabel}
              formatter={formatter}
              color={color}
              hideIndicator={hideIndicator}
              config={config}
              nameKey={nameKey}
            />
          ))}
      </div>
    </div>
  )
}
const ChartLegend = RechartsPrimitive.Legend
const ChartLegendContent = ({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean
  nameKey?: string
} & RechartsPrimitive.DefaultLegendContentProps) => {
  const { config } = useChart()
  if (!payload?.length) {
    return null
  }
  return (
    <div
      className={cn(
        "gap-4 flex items-center justify-center",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          return (
            <div
              key={`${String(item.dataKey ?? item.value ?? "item")}-${key}`}
              className={cn(
                "gap-1.5 [&>svg]:h-3 [&>svg]:w-3 flex items-center [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
    </div>
  )
}
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
