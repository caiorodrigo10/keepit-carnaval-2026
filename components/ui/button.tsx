import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground rounded-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-white rounded-full hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-[rgba(0,0,0,0.1)] bg-white text-foreground rounded-full shadow-xs hover:bg-secondary hover:shadow-card",
        secondary:
          "bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80",
        ghost:
          "rounded-full hover:bg-accent/10 hover:text-accent-foreground",
        link: "text-accent underline-offset-4 hover:underline",
        accent:
          "bg-keepit-emerald text-white rounded-full shadow-[0_25px_50px_-12px_rgba(16,185,129,0.3)] hover:bg-keepit-emerald-dark hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-8 py-3 has-[>svg]:px-4",
        xs: "h-7 gap-1 rounded-full px-3 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 rounded-full gap-1.5 px-6 has-[>svg]:px-4 text-sm",
        lg: "h-14 rounded-full px-14 text-lg has-[>svg]:px-6",
        xl: "h-16 rounded-full px-16 text-lg has-[>svg]:px-8",
        icon: "size-11 rounded-full",
        "icon-xs": "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-full",
        "icon-lg": "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
