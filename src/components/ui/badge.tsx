import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-white text-slate-700",
        navy: "border-primary/15 bg-primary/10 text-primary",
        accent: "border-accent/15 bg-accent/10 text-accent",
        success: "border-success/15 bg-success/10 text-success",
        warning: "border-warning/15 bg-warning/10 text-warning",
        danger: "border-danger/15 bg-danger/10 text-danger",
        muted: "border-slate-200 bg-slate-100 text-slate-500",
        ai: "border-warning border-dashed bg-warning/10 text-warning"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
