import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface PositionBadgeProps {
  name: string;
  color: string;
  className?: string;
  showIcon?: boolean;
}

// Helper to determine if a color is light or dark
function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export function PositionBadge({ name, color, className, showIcon = true }: PositionBadgeProps) {
  const textColor = isLightColor(color) ? "#1F2937" : "#FFFFFF";

  return (
    <Badge
      className={cn("flex items-center gap-1 justify-center border-0", className)}
      style={{ backgroundColor: color, color: textColor }}
    >
      {showIcon && <Briefcase className="h-3 w-3" />}
      {name}
    </Badge>
  );
}
