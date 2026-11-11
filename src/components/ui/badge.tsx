import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-forest-800 text-cream-50 hover:bg-forest-900",
        secondary:
          "border-transparent bg-cream-200 text-forest-900 hover:bg-cream-300",
        destructive:
          "border-transparent bg-tomato-600 text-white hover:bg-tomato-700",
        outline: "text-foreground border-cream-300",
        veg: "border-emerald-600/40 bg-emerald-50 text-emerald-800 font-medium",
        nonveg: "border-rose-600/40 bg-rose-50 text-rose-800 font-medium",
        spice: "border-amber-500/40 bg-amber-50 text-amber-800 font-medium",
        station: "border-emerald-500/30 bg-emerald-950/60 text-emerald-300 font-mono text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
