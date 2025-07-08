import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-md border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation transition-colors hover:border-ring/50 resize-none md:min-h-[80px] md:px-3 md:py-2 md:text-sm",
        className
      )}
      ref={ref}
      style={{ fontSize: '16px' }} // Prevents zoom on iOS
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
