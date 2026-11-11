import React from "react";
import { DietaryType } from "@/types/menu";
import { cn } from "@/lib/utils";

interface DietaryBadgeProps {
  type: DietaryType;
  showLabel?: boolean;
  className?: string;
}

export function DietaryBadge({
  type,
  showLabel = false,
  className,
}: DietaryBadgeProps) {
  const isVeg = type === "veg" || type === "vegan";
  const labelMap: Record<DietaryType, string> = {
    veg: "Veg",
    vegan: "Vegan",
    "non-veg": "Non-Veg",
    egg: "Egg",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {isVeg ? (
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 border-emerald-600 bg-white p-[2px]"
          title={labelMap[type]}
          aria-label={labelMap[type]}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 bg-white p-[2px]",
            type === "egg" ? "border-amber-600" : "border-tomato-600"
          )}
          title={labelMap[type]}
          aria-label={labelMap[type]}
        >
          <span
            className={cn(
              "h-0 w-0 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent",
              type === "egg" ? "border-b-amber-600" : "border-b-tomato-600"
            )}
          />
        </span>
      )}
      {showLabel && (
        <span
          className={cn(
            "text-xs font-medium",
            isVeg
              ? "text-emerald-800"
              : type === "egg"
              ? "text-amber-800"
              : "text-tomato-700"
          )}
        >
          {labelMap[type]}
        </span>
      )}
    </span>
  );
}
