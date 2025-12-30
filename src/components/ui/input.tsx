
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, value, ...props }, ref) => { // Destructure value from props
    return (
      <input
        type={type}
        // Ensure the native input's value is never undefined.
        // If incoming value is undefined or null, use an empty string.
        value={value === undefined || value === null ? '' : value}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-primary/50 focus-visible:shadow-sm hover:border-primary/30 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-inner-soft",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
