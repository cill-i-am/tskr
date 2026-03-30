import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"

interface SettingsIdentityPreviewProps {
  displayName: string
  fallbackLabel: string
  imageUrl: string | null
  supportingCopy: string
}

const getIdentityInitials = (displayName: string) =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ID"

const SettingsIdentityPreview = ({
  displayName,
  fallbackLabel,
  imageUrl,
  supportingCopy,
}: SettingsIdentityPreviewProps) => (
  <div className="gap-3 px-4 py-3 flex items-center rounded-xl border bg-muted/30">
    <Avatar key={imageUrl ?? "no-image"} size="lg">
      {imageUrl ? (
        <AvatarImage alt={`${displayName} ${fallbackLabel}`} src={imageUrl} />
      ) : null}
      <AvatarFallback>{getIdentityInitials(displayName)}</AvatarFallback>
    </Avatar>
    <div className="min-w-0 gap-1 flex flex-col">
      <p className="text-base font-medium truncate">{displayName}</p>
      <p className="text-sm text-muted-foreground">{supportingCopy}</p>
    </div>
  </div>
)

export { SettingsIdentityPreview }
