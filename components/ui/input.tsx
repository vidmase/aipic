import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md border border-input bg-background px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation transition-colors hover:border-ring/50 md:h-10 md:px-3 md:py-2 md:text-sm",
          className
        )}
        ref={ref}
        style={{ fontSize: '16px' }} // Prevents zoom on iOS
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
